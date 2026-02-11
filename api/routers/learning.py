from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from typing import List, Optional
from .. import models, schemas, security, deps
from ..database import get_db

router = APIRouter(
    prefix="/api/learning",
    tags=["learning"],
)

@router.get("/today", response_model=schemas.DailyTaskResponse)
def get_today_task(
    child_id: Optional[str] = None,
    limit: int = 5,
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    # Determine which child is learning
    target_child_id = child_id
    if not target_child_id:
        # Default to the first child of the current parent
        child = db.query(models.Child).filter(models.Child.parent_id == current_user.id).first()
        if child:
            target_child_id = child.id
    
    # If no child found (rare case if registered properly), we might return empty or error
    if not target_child_id:
        # Fallback or empty
        pass

    # Fetch words belonging to this parent
    # In real app, we would use spaced repetition algorithm based on target_child_id
    words = db.query(models.Word).join(models.Dictionary).filter(models.Word.parent_id == current_user.id).order_by(func.random()).limit(limit).all()
    
    # Flatten response for words
    flattened_words = []
    for w in words:
        flattened_words.append({
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

    return {
        "total_words": limit,
        "learned_words": 0,
        "remaining_words": len(words),
        "words": flattened_words
    }

@router.get("/settings", response_model=schemas.LearningSettings)
def get_learning_settings(
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    child = db.query(models.Child).filter(models.Child.parent_id == current_user.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")
    
    if not child.settings:
        return schemas.LearningSettings()
        
    return child.settings

@router.put("/settings", response_model=schemas.LearningSettings)
def update_learning_settings(
    settings: schemas.LearningSettings,
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    child = db.query(models.Child).filter(models.Child.parent_id == current_user.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")
    
    # Store settings as dict in JSON column
    child.settings = settings.model_dump()
    db.commit()
    db.refresh(child)
    return child.settings

@router.post("/record")
def record_learning_result(
    record: schemas.LearningRecordCreate, 
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    # Determine child
    child = db.query(models.Child).filter(models.Child.parent_id == current_user.id).first()
    if not child:
        raise HTTPException(status_code=400, detail="No child profile found")
    
    target_child_id = child.id
    
    # Record the result
    db_record = models.LearningRecord(
        child_id=target_child_id,
        word_id=record.word_id,
        result=record.result,
        time_spent=record.time_spent
    )
    db.add(db_record)
    db.commit()
    return {"status": "success"}

@router.get("/history/dates", response_model=List[schemas.LearningHistoryItem])
def get_learning_history_dates(
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    child = db.query(models.Child).filter(models.Child.parent_id == current_user.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")
    
    # Group by date and count
    # Note: SQLite and MySQL date functions differ. Using Python aggregation for simplicity/compatibility or specific SQL func
    # For MySQL: func.date(models.LearningRecord.created_at)
    
    records = db.query(
        func.date(models.LearningRecord.created_at).label('date'),
        func.count(models.LearningRecord.id).label('total_words'),
        func.sum(models.LearningRecord.time_spent).label('duration')
    ).filter(
        models.LearningRecord.child_id == child.id
    ).group_by(
        func.date(models.LearningRecord.created_at)
    ).all()
    
    result = []
    for r in records:
        # Calculate completed (remembered) words count for this date
        # This might be inefficient if many dates. Optimized query would be better.
        # But for MVP it's okay.
        completed = db.query(models.LearningRecord).filter(
            models.LearningRecord.child_id == child.id,
            func.date(models.LearningRecord.created_at) == r.date,
            models.LearningRecord.result == 'remembered'
        ).count()
        
        result.append({
            "date": r.date,
            "total_words": r.total_words,
            "completed_words": completed,
            "duration_minutes": round((r.duration or 0) / 60, 1)
        })
        
    return result

@router.get("/history/{date}", response_model=schemas.LearningDayDetail)
def get_learning_history_detail(
    date: str,
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    child = db.query(models.Child).filter(models.Child.parent_id == current_user.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")
        
    records = db.query(models.LearningRecord).filter(
        models.LearningRecord.child_id == child.id,
        func.date(models.LearningRecord.created_at) == date
    ).all()
    
    if not records:
        raise HTTPException(status_code=404, detail="No records found for this date")
        
    # Prepare summary
    total_words = len(records)
    completed_words = sum(1 for r in records if r.result == 'remembered')
    duration_minutes = sum((r.time_spent or 0) for r in records) / 60
    
    summary = {
        "date": date,
        "total_words": total_words,
        "completed_words": completed_words,
        "duration_minutes": round(duration_minutes, 1)
    }
    
    # Prepare details
    details = []
    for r in records:
        # Fetch word text (inefficient N+1, but okay for MVP daily limit < 50)
        # Optimized: Eager load word relationship
        word_obj = db.query(models.Word).join(models.Dictionary).filter(models.Word.id == r.word_id).first()
        word_text = word_obj.dictionary.word if word_obj else "Unknown"
        
        details.append({
            "word": word_text,
            "result": r.result,
            "time_spent": r.time_spent or 0,
            "created_at": r.created_at
        })
        
    return {
        "date": date,
        "summary": summary,
        "records": details
    }
