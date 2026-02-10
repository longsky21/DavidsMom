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

@router.get("/", response_model=List[schemas.WordResponse])
def get_words(
    skip: int = 0, 
    limit: int = 100, 
    category: Optional[str] = None,
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Word).filter(models.Word.parent_id == current_user.id)
    if category:
        query = query.filter(models.Word.category == category)
    words = query.offset(skip).limit(limit).all()
    return words

@router.post("/", response_model=schemas.WordResponse)
async def create_word(
    word_in: schemas.WordCreate, 
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    # Check if word already exists for this parent
    db_word = db.query(models.Word).filter(
        models.Word.parent_id == current_user.id,
        models.Word.word == word_in.word
    ).first()
    
    if db_word:
        raise HTTPException(status_code=400, detail="Word already exists in your library")

    # If details are missing, try to fetch from external API
    if not word_in.meaning or not word_in.phonetic_us:
        fetched_info = await word_service.fetch_word_info(word_in.word)
        if fetched_info:
            if not word_in.meaning:
                word_in.meaning = fetched_info.get("meaning", "")
            if not word_in.phonetic_us:
                word_in.phonetic_us = fetched_info.get("phonetic_us", "")
            if not word_in.phonetic_uk:
                word_in.phonetic_uk = fetched_info.get("phonetic_uk", "")
            if not word_in.audio_us_url:
                word_in.audio_us_url = fetched_info.get("audio_us_url", "")
            if not word_in.audio_uk_url:
                word_in.audio_uk_url = fetched_info.get("audio_uk_url", "")
            if not word_in.example and fetched_info.get("example"):
                word_in.example = fetched_info.get("example")
            if not word_in.image_url:
                word_in.image_url = fetched_info.get("image_url", "")

    db_word = models.Word(
        **word_in.dict(),
        parent_id=current_user.id
    )
    db.add(db_word)
    db.commit()
    db.refresh(db_word)
    return db_word

@router.get("/search")
async def search_word_info(word: str):
    # Helper endpoint to preview word info before adding
    return await word_service.fetch_word_info(word)

@router.delete("/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_word(
    word_id: int,
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
