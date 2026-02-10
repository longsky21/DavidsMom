from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from typing import List
from .. import models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/api/learning",
    tags=["learning"],
)

@router.get("/today", response_model=schemas.DailyTaskResponse)
def get_today_task(
    child_id: str = "demo-child", # Placeholder for simplicity
    limit: int = 5,
    db: Session = Depends(get_db)
):
    # For demo purposes, we just pick random words from the DB
    # In real app, we would use spaced repetition algorithm based on child_id
    
    words = db.query(models.Word).order_by(func.random()).limit(limit).all()
    
    return {
        "total_words": limit,
        "learned_words": 0,
        "remaining_words": len(words),
        "words": words
    }

@router.post("/record")
def record_learning_result(record: schemas.LearningRecordCreate, db: Session = Depends(get_db)):
    # Record the result
    # In real app, update next review date
    db_record = models.LearningRecord(
        child_id="demo-child", # Placeholder
        word_id=record.word_id,
        result=record.result,
        time_spent=record.time_spent
    )
    db.add(db_record)
    db.commit()
    return {"status": "success"}
