from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas, security, deps
from ..database import get_db
from ..services import word_service

router = APIRouter(
    prefix="/api/words",
    tags=["words"],
)

@router.get("/suggest")
def suggest_words(
    q: str,
    db: Session = Depends(get_db)
):
    if len(q) < 3:
        return []
        
    # 1. Local search
    local_suggestions = db.query(models.Dictionary.word)\
        .filter(models.Dictionary.word.like(f"{q}%"))\
        .limit(5)\
        .all()
    
    suggestions = [w.word for w in local_suggestions]
    
    # 2. External search (Youdao) if local results are few
    if len(suggestions) < 5:
        external_suggestions = word_service.get_word_suggestions(q)
        for s in external_suggestions:
            if s not in suggestions:
                suggestions.append(s)
                
    return suggestions[:5]

@router.get("/", response_model=List[schemas.WordResponse])
def get_words(
    skip: int = 0, 
    limit: int = 100, 
    category: Optional[str] = None,
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Word).join(models.Dictionary).filter(models.Word.parent_id == current_user.id)
    if category:
        query = query.filter(models.Word.category == category)
    
    # Sort by created_at desc (newest first)
    words = query.order_by(models.Word.created_at.desc()).offset(skip).limit(limit).all()
    
    # Flatten response
    result = []
    for w in words:
        result.append({
            "id": w.id,
            "parent_id": w.parent_id,
            "word": w.dictionary.word,
            "meaning": w.dictionary.meaning,
            "phonetic_us": w.dictionary.phonetic_us,
            "phonetic_uk": w.dictionary.phonetic_uk,
            "example": w.dictionary.example,
            "image_url": w.dictionary.image_url,
            "audio_us_url": w.dictionary.audio_us_url,
            "audio_uk_url": w.dictionary.audio_uk_url,
            "category": w.category,
            "difficulty": w.difficulty,
            "created_at": w.created_at
        })
    return result

@router.post("/", response_model=schemas.WordResponse)
async def create_word(
    word_in: schemas.WordCreate, 
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Check if word already exists in Dictionary (Case Insensitive Check)
    # We store the canonical form (e.g. "January"), but when checking existence we might search "january"
    # Ideally, we should fetch info first to get the canonical form if we don't have it.
    
    # Strategy: 
    # - First, fetch info from Youdao to get the canonical word (e.g. "January")
    # - Then check if "January" exists in DB.
    
    normalized_input = word_in.word.strip()
    
    # Fetch info first to ensure we have the correct casing and data
    # Note: word_service.fetch_word_info handles lowercasing internally for the query, 
    # and returns the correct 'word' (e.g. "January") from the API response.
    fetched_info = await word_service.fetch_word_info(normalized_input)
    
    if not fetched_info:
         raise HTTPException(status_code=400, detail="Could not fetch word information")
    
    canonical_word = fetched_info.get("word") # This should be the correct casing, e.g. "January"
    
    # Check if this canonical word exists in DB
    dictionary_entry = db.query(models.Dictionary).filter(models.Dictionary.word == canonical_word).first()
    
    # 2. If not in Dictionary, create entry using fetched info
    if not dictionary_entry:
        dictionary_entry = models.Dictionary(
            word=canonical_word,
            meaning=fetched_info.get("meaning", ""),
            phonetic_us=fetched_info.get("phonetic_us", ""),
            phonetic_uk=fetched_info.get("phonetic_uk", ""),
            example=fetched_info.get("example", ""),
            image_url=fetched_info.get("image_url", ""),
            audio_us_url=fetched_info.get("audio_us_url", ""),
            audio_uk_url=fetched_info.get("audio_uk_url", "")
        )
        db.add(dictionary_entry)
        db.commit()
        db.refresh(dictionary_entry)

    # 3. Check if word is already linked to this parent
    existing_link = db.query(models.Word).filter(
        models.Word.parent_id == current_user.id,
        models.Word.dictionary_id == dictionary_entry.id
    ).first()
    
    if existing_link:
        raise HTTPException(status_code=400, detail="Word already exists in your library")

    # 4. Create Word link
    db_word = models.Word(
        parent_id=current_user.id,
        dictionary_id=dictionary_entry.id,
        category=word_in.category,
        difficulty=word_in.difficulty
    )
    db.add(db_word)
    db.commit()
    db.refresh(db_word)
    
    # Return flattened response
    return {
        "id": db_word.id,
        "parent_id": db_word.parent_id,
        "word": dictionary_entry.word,
        "meaning": dictionary_entry.meaning,
        "phonetic_us": dictionary_entry.phonetic_us,
        "phonetic_uk": dictionary_entry.phonetic_uk,
        "example": dictionary_entry.example,
        "image_url": dictionary_entry.image_url,
        "audio_us_url": dictionary_entry.audio_us_url,
        "audio_uk_url": dictionary_entry.audio_uk_url,
        "category": db_word.category,
        "difficulty": db_word.difficulty,
        "created_at": db_word.created_at
    }

@router.get("/search")
async def search_word_info(
    word: str,
    db: Session = Depends(get_db)
):
    # Helper endpoint to preview word info before adding
    normalized_word = word.strip().lower()
    
    # 1. Check local Dictionary first
    dictionary_entry = db.query(models.Dictionary).filter(models.Dictionary.word == normalized_word).first()
    if dictionary_entry:
        return {
            "word": dictionary_entry.word,
            "meaning": dictionary_entry.meaning,
            "phonetic_us": dictionary_entry.phonetic_us,
            "phonetic_uk": dictionary_entry.phonetic_uk,
            "example": dictionary_entry.example,
            "image_url": dictionary_entry.image_url,
            "audio_us_url": dictionary_entry.audio_us_url,
            "audio_uk_url": dictionary_entry.audio_uk_url
        }

    # 2. If not found, fetch from external API
    return await word_service.fetch_word_info(word)

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
