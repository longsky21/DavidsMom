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
    words = db.query(models.Word).filter(models.Word.parent_id == current_user.id).order_by(func.random()).limit(limit).all()
    
    return {
        "total_words": limit,
        "learned_words": 0,
        "remaining_words": len(words),
        "words": words
    }

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
