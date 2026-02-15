from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, bindparam
from typing import List, Optional
from .. import models, schemas, security, deps
from ..database import get_db, get_dictionary_db
from ..services import word_service

router = APIRouter(
    prefix="/api/words",
    tags=["words"],
)

@router.get("/suggest")
def suggest_words(
    q: str,
    dict_db: Session = Depends(get_dictionary_db)
):
    if len(q) < 3:
        return []

    rows = dict_db.execute(
        text(
            """
            SELECT vc_vocabulary
            FROM word
            WHERE vc_vocabulary LIKE :prefix
            ORDER BY vc_vocabulary
            LIMIT 5
            """
        ),
        {"prefix": f"{q}%"},
    ).fetchall()
    return [r[0] for r in rows]


def _fetch_dictionary_entries(dict_db: Session, vc_ids: List[str]) -> dict:
    if not vc_ids:
        return {}
    stmt = (
        text(
            """
            SELECT
                w.vc_id,
                w.vc_vocabulary,
                w.vc_phonetic_us,
                w.vc_phonetic_uk,
                COALESCE(NULLIF(t.translation, ''), e.youdao_translation) AS translation,
                e.image_url,
                e.audio_us_url,
                e.audio_uk_url,
                e.example
            FROM word w
            LEFT JOIN word_translation t ON t.vc_id = w.vc_id
            LEFT JOIN word_ext e ON e.vc_id = w.vc_id
            WHERE w.vc_id IN :vc_ids
            """
        )
        .bindparams(bindparam("vc_ids", expanding=True))
    )
    rows = dict_db.execute(stmt, {"vc_ids": vc_ids}).mappings().all()
    return {r["vc_id"]: dict(r) for r in rows}

@router.get("/", response_model=List[schemas.WordResponse])
def get_words(
    skip: int = 0, 
    limit: int = 100, 
    category: Optional[str] = None,
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
    dict_db: Session = Depends(get_dictionary_db),
):
    query = db.query(models.Word).filter(
        models.Word.parent_id == current_user.id,
        models.Word.dict_vc_id.isnot(None),
        models.Word.dict_vc_id != "",
    )
    if category:
        query = query.filter(models.Word.category == category)
    
    # Sort by created_at desc (newest first)
    words = query.order_by(models.Word.created_at.desc()).offset(skip).limit(limit).all()

    vc_ids = [w.dict_vc_id for w in words if w.dict_vc_id]
    dict_map = _fetch_dictionary_entries(dict_db, vc_ids)

    result = []
    for w in words:
        payload = None
        if w.dict_vc_id:
            payload = dict_map.get(w.dict_vc_id)
            if payload and (not payload.get("image_url") or not payload.get("audio_us_url") or not payload.get("example") or not payload.get("translation")):
                ext = word_service.ensure_word_ext(dict_db=dict_db, vc_id=w.dict_vc_id, word=payload.get("vc_vocabulary") or "")
                payload.update(ext)
                if not payload.get("translation"):
                    payload["translation"] = ext.get("youdao_translation") or ""

        if payload:
            result.append(
                {
                    "id": w.id,
                    "parent_id": w.parent_id,
                    "word": payload.get("vc_vocabulary") or "",
                    "meaning": payload.get("translation") or "",
                    "phonetic_us": payload.get("vc_phonetic_us") or None,
                    "phonetic_uk": payload.get("vc_phonetic_uk") or None,
                    "example": payload.get("example") or None,
                    "image_url": payload.get("image_url") or None,
                    "audio_us_url": payload.get("audio_us_url") or None,
                    "audio_uk_url": payload.get("audio_uk_url") or None,
                    "category": w.category,
                    "difficulty": w.difficulty,
                    "created_at": w.created_at,
                }
            )
            continue
    return result

@router.post("/", response_model=schemas.WordResponse)
async def create_word(
    word_in: schemas.WordCreate, 
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
    dict_db: Session = Depends(get_dictionary_db),
):
    normalized_input = word_in.word.strip()

    row = dict_db.execute(
        text(
            """
            SELECT
                w.vc_id,
                w.vc_vocabulary,
                w.vc_phonetic_us,
                w.vc_phonetic_uk,
                COALESCE(NULLIF(t.translation, ''), e.youdao_translation) AS translation
            FROM word w
            LEFT JOIN word_translation t ON t.vc_id = w.vc_id
            LEFT JOIN word_ext e ON e.vc_id = w.vc_id
            WHERE w.vc_vocabulary = :vocab
            LIMIT 1
            """
        ),
        {"vocab": normalized_input},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Word not found in base dictionary")

    vc_id = row["vc_id"]

    existing_link = db.query(models.Word).filter(
        models.Word.parent_id == current_user.id,
        models.Word.dict_vc_id == vc_id,
    ).first()
    
    if existing_link:
        raise HTTPException(status_code=400, detail="Word already exists in your library")

    db_word = models.Word(
        parent_id=current_user.id,
        dictionary_id=None,
        dict_vc_id=vc_id,
        category=word_in.category,
        difficulty=word_in.difficulty
    )
    db.add(db_word)
    db.commit()
    db.refresh(db_word)

    ext = word_service.ensure_word_ext(dict_db=dict_db, vc_id=vc_id, word=row.get("vc_vocabulary") or normalized_input)
    meaning = row.get("translation") or ext.get("youdao_translation") or ""

    return {
        "id": db_word.id,
        "parent_id": db_word.parent_id,
        "word": row.get("vc_vocabulary") or normalized_input,
        "meaning": meaning,
        "phonetic_us": row.get("vc_phonetic_us") or None,
        "phonetic_uk": row.get("vc_phonetic_uk") or None,
        "example": ext.get("example"),
        "image_url": ext.get("image_url"),
        "audio_us_url": ext.get("audio_us_url"),
        "audio_uk_url": ext.get("audio_uk_url"),
        "category": db_word.category,
        "difficulty": db_word.difficulty,
        "created_at": db_word.created_at
    }

@router.get("/search")
async def search_word_info(
    word: str,
    dict_db: Session = Depends(get_dictionary_db)
):
    normalized_word = word.strip()

    row = dict_db.execute(
        text(
            """
            SELECT
                w.vc_id,
                w.vc_vocabulary,
                w.vc_phonetic_us,
                w.vc_phonetic_uk,
                COALESCE(NULLIF(t.translation, ''), e.youdao_translation) AS translation,
                e.image_url,
                e.audio_us_url,
                e.audio_uk_url,
                e.example
            FROM word w
            LEFT JOIN word_translation t ON t.vc_id = w.vc_id
            LEFT JOIN word_ext e ON e.vc_id = w.vc_id
            WHERE w.vc_vocabulary = :vocab
            LIMIT 1
            """
        ),
        {"vocab": normalized_word},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Word not found in base dictionary")

    payload = dict(row)
    if not payload.get("image_url") or not payload.get("audio_us_url") or not payload.get("example") or not payload.get("translation"):
        ext = word_service.ensure_word_ext(dict_db=dict_db, vc_id=payload["vc_id"], word=payload.get("vc_vocabulary") or normalized_word)
        payload.update(ext)
        if not payload.get("translation"):
            payload["translation"] = ext.get("youdao_translation") or ""

    return {
        "word": payload.get("vc_vocabulary") or normalized_word,
        "meaning": payload.get("translation") or "",
        "phonetic_us": payload.get("vc_phonetic_us") or None,
        "phonetic_uk": payload.get("vc_phonetic_uk") or None,
        "example": payload.get("example") or None,
        "image_url": payload.get("image_url") or None,
        "audio_us_url": payload.get("audio_us_url") or None,
        "audio_uk_url": payload.get("audio_uk_url") or None,
    }

@router.delete("/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_word(
    word_id: str,
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    word = db.query(models.Word).filter(
        models.Word.id == word_id,
        models.Word.parent_id == current_user.id
    ).first()
    
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
        
    db.delete(word)
    db.commit()
    return None
