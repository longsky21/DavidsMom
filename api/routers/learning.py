from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from sqlalchemy import text, bindparam
from typing import List, Optional
from .. import models, schemas, security, deps
from ..database import get_db, get_dictionary_db
from ..services import word_service

router = APIRouter(
    prefix="/api/learning",
    tags=["learning"],
)

@router.get("/today", response_model=schemas.DailyTaskResponse)
def get_today_task(
    child_id: Optional[str] = None,
    limit: Optional[int] = None,
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
    dict_db: Session = Depends(get_dictionary_db),
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

    effective_limit = limit
    if effective_limit is None:
        child = db.query(models.Child).filter(models.Child.id == target_child_id).first()
        if child and isinstance(child.settings, dict):
            effective_limit = int(child.settings.get("daily_words") or 20)
        else:
            effective_limit = 20

    # Fetch words belonging to this parent
    # In real app, we would use spaced repetition algorithm based on target_child_id
    words = (
        db.query(models.Word)
        .filter(
            models.Word.parent_id == current_user.id,
            models.Word.dict_vc_id.isnot(None),
            models.Word.dict_vc_id != "",
        )
        .order_by(func.random())
        .limit(effective_limit)
        .all()
    )

    vc_ids = [w.dict_vc_id for w in words if w.dict_vc_id]
    dict_map = {}
    if vc_ids:
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
        dict_map = {r["vc_id"]: dict(r) for r in rows}
    
    # Flatten response for words
    flattened_words = []
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
            flattened_words.append(
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

    return {
        "total_words": effective_limit,
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
    
    # 1. Word records
    word_records = db.query(
        func.date(models.LearningRecord.created_at).label('date'),
        func.count(models.LearningRecord.id).label('total_words'),
        func.sum(models.LearningRecord.time_spent).label('duration')
    ).filter(
        models.LearningRecord.child_id == child.id
    ).group_by(
        func.date(models.LearningRecord.created_at)
    ).all()
    
    # 2. Video sessions
    video_dates = db.query(
        func.date(models.MediaLearningSession.started_at).label('date')
    ).filter(
        models.MediaLearningSession.child_id == child.id,
        models.MediaLearningSession.module == 'video'
    ).group_by(
        func.date(models.MediaLearningSession.started_at)
    ).all()
    video_date_set = {str(r.date) for r in video_dates}

    # 3. Audio sessions
    audio_dates = db.query(
        func.date(models.MediaLearningSession.started_at).label('date')
    ).filter(
        models.MediaLearningSession.child_id == child.id,
        models.MediaLearningSession.module == 'audio'
    ).group_by(
        func.date(models.MediaLearningSession.started_at)
    ).all()
    audio_date_set = {str(r.date) for r in audio_dates}

    # Collect all unique dates
    all_dates = set()
    word_map = {}
    
    for r in word_records:
        date_str = str(r.date)
        all_dates.add(date_str)
        
        # Calculate completed (remembered) words count for this date
        completed = db.query(models.LearningRecord).filter(
            models.LearningRecord.child_id == child.id,
            func.date(models.LearningRecord.created_at) == r.date,
            models.LearningRecord.result == 'remembered'
        ).count()
        
        word_map[date_str] = {
            "total_words": r.total_words,
            "completed_words": completed,
            "duration_minutes": round((r.duration or 0) / 60, 1)
        }

    all_dates.update(video_date_set)
    all_dates.update(audio_date_set)
    
    result = []
    for date_str in sorted(list(all_dates), reverse=True):
        w_data = word_map.get(date_str, {"total_words": 0, "completed_words": 0, "duration_minutes": 0})
        
        result.append({
            "date": date_str,
            "total_words": w_data["total_words"],
            "completed_words": w_data["completed_words"],
            "duration_minutes": w_data["duration_minutes"],
            "has_words": date_str in word_map,
            "has_video": date_str in video_date_set,
            "has_audio": date_str in audio_date_set
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
        # Check if there are media sessions even if no word records
        # If both are empty, we might return 404 or empty structure. 
        # But let's check media sessions first.
        pass
        
    # Fetch Media Sessions
    media_sessions = db.query(models.MediaLearningSession).filter(
        models.MediaLearningSession.child_id == child.id,
        func.date(models.MediaLearningSession.started_at) == date
    ).all()

    video_sessions = [s for s in media_sessions if s.module == 'video']
    audio_sessions = [s for s in media_sessions if s.module == 'audio']

    if not records and not media_sessions:
        raise HTTPException(status_code=404, detail="No records found for this date")

    # Prepare summary
    total_words = len(records)
    completed_words = sum(1 for r in records if r.result == 'remembered')
    duration_minutes = sum((r.time_spent or 0) for r in records) / 60
    
    # Add media duration to summary duration?
    # The LearningHistoryItem definition of duration_minutes usually implies total learning time.
    # But currently it seems derived from word records in get_learning_history_dates.
    # Let's align it. 
    # For this detail endpoint, let's keep it as sum of everything or separate?
    # The Summary schema has one duration_minutes. Let's sum all.
    
    media_duration_seconds = sum(s.duration_seconds for s in media_sessions)
    total_duration_minutes = duration_minutes + (media_duration_seconds / 60)
    
    summary = {
        "date": date,
        "total_words": total_words,
        "completed_words": completed_words,
        "duration_minutes": round(total_duration_minutes, 1),
        "has_words": len(records) > 0,
        "has_video": len(video_sessions) > 0,
        "has_audio": len(audio_sessions) > 0
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

    # Prepare Media Details
    video_details = []
    for s in video_sessions:
        # Fetch resource title
        res = db.query(models.MediaResource).filter(models.MediaResource.id == s.resource_id).first()
        title = res.filename if res else "Unknown Video"
        video_details.append({
            "resource_title": title,
            "module": "video",
            "duration_seconds": s.duration_seconds,
            "completion_percent": s.completion_percent,
            "started_at": s.started_at
        })

    audio_details = []
    for s in audio_sessions:
        # Fetch resource title
        res = db.query(models.MediaResource).filter(models.MediaResource.id == s.resource_id).first()
        title = res.filename if res else "Unknown Audio"
        audio_details.append({
            "resource_title": title,
            "module": "audio",
            "duration_seconds": s.duration_seconds,
            "completion_percent": s.completion_percent,
            "started_at": s.started_at
        })
        
    return {
        "date": date,
        "summary": summary,
        "records": details,
        "video_sessions": video_details,
        "audio_sessions": audio_details
    }
