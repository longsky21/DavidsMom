from datetime import datetime, timedelta, date
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql.expression import func

from .. import deps, models, schemas
from ..database import get_db


router = APIRouter(
    prefix="/api/media",
    tags=["media"],
)


def get_default_child(db: Session, parent_id: str) -> models.Child:
    child = db.query(models.Child).filter(models.Child.parent_id == parent_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")
    return child


def get_or_create_media_progress(db: Session, *, child_id: str, module: str) -> models.ChildMediaProgress:
    progress = (
        db.query(models.ChildMediaProgress)
        .filter(models.ChildMediaProgress.child_id == child_id, models.ChildMediaProgress.module == module)
        .first()
    )
    if progress:
        return progress

    progress = models.ChildMediaProgress(
        child_id=child_id,
        module=module,
        current_difficulty_level=1,
        stats={},
    )
    db.add(progress)
    db.flush()
    return progress


def normalize_period(period: str) -> Tuple[datetime, datetime]:
    now = datetime.utcnow()
    value = (period or "").strip().lower()
    if value == "week":
        start = now - timedelta(days=7)
        return start, now
    if value == "month":
        start = now - timedelta(days=30)
        return start, now
    raise HTTPException(status_code=400, detail="Invalid period. Use week or month.")


@router.get("/resources", response_model=List[schemas.MediaResourceResponse])
def list_media_resources(
    media_type: Optional[str] = None,
    difficulty_level: Optional[int] = None,
    directory: Optional[str] = None,
    directories: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: models.Parent = Depends(deps.get_current_parent),
    db: Session = Depends(get_db),
):
    query = db.query(models.MediaResource)
    if media_type:
        query = query.filter(models.MediaResource.media_type == media_type)
    if difficulty_level:
        query = query.filter(models.MediaResource.difficulty_level == difficulty_level)

    directory_values: List[str] = []
    if directory and directory.strip():
        directory_values.append(directory.strip())
    if directories:
        directory_values.extend([v.strip() for v in directories.split(",") if v and v.strip()])
    if directory_values:
        directory_values = list(dict.fromkeys(directory_values))
        query = query.filter(models.MediaResource.directory.in_(directory_values))
    if q:
        like = f"%{q}%"
        query = query.filter(
            models.MediaResource.filename.like(like)
            | models.MediaResource.directory.like(like)
            | models.MediaResource.url.like(like)
        )

    items = (
        query.order_by(models.MediaResource.created_at.asc(), models.MediaResource.id.asc())
        .offset(offset)
        .limit(min(limit, 200))
        .all()
    )
    return items


@router.get("/resources/directories", response_model=List[str])
def list_media_resource_directories(
    media_type: Optional[str] = None,
    current_user: models.Parent = Depends(deps.get_current_parent),
    db: Session = Depends(get_db),
):
    query = db.query(models.MediaResource.directory).filter(models.MediaResource.directory.isnot(None))
    if media_type:
        query = query.filter(models.MediaResource.media_type == media_type)
    rows = query.distinct().order_by(models.MediaResource.directory.asc()).all()
    return [r[0] for r in rows if r and r[0]]


@router.get("/plan", response_model=List[schemas.MediaPlanItemResponse])
def list_media_plan(
    module: str,
    child_id: Optional[str] = None,
    include_disabled: bool = True,
    include_deleted: bool = False,
    current_user: models.Parent = Depends(deps.get_current_parent),
    db: Session = Depends(get_db),
):
    child = get_default_child(db, current_user.id) if not child_id else db.query(models.Child).filter(
        models.Child.id == child_id, models.Child.parent_id == current_user.id
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")

    query = (
        db.query(models.ChildMediaPlanItem)
        .options(joinedload(models.ChildMediaPlanItem.resource))
        .filter(models.ChildMediaPlanItem.child_id == child.id, models.ChildMediaPlanItem.module == module)
    )
    if not include_disabled:
        query = query.filter(models.ChildMediaPlanItem.is_enabled.is_(True))
    if not include_deleted:
        query = query.filter(models.ChildMediaPlanItem.is_deleted.is_(False))

    return query.order_by(models.ChildMediaPlanItem.order_index.asc(), models.ChildMediaPlanItem.added_at.asc()).all()


@router.post("/plan/add", response_model=List[schemas.MediaPlanItemResponse])
def add_media_plan_item(
    req: schemas.MediaPlanAddRequest,
    child_id: Optional[str] = None,
    current_user: models.Parent = Depends(deps.get_current_parent),
    db: Session = Depends(get_db),
):
    child = get_default_child(db, current_user.id) if not child_id else db.query(models.Child).filter(
        models.Child.id == child_id, models.Child.parent_id == current_user.id
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")

    resource = db.query(models.MediaResource).filter(models.MediaResource.id == req.resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    def ensure_item(resource_id: str, module: str) -> None:
        existing = (
            db.query(models.ChildMediaPlanItem)
            .filter(
                models.ChildMediaPlanItem.child_id == child.id,
                models.ChildMediaPlanItem.resource_id == resource_id,
                models.ChildMediaPlanItem.module == module,
            )
            .first()
        )
        if existing:
            if existing.is_deleted:
                existing.is_deleted = False
            if not existing.is_enabled:
                existing.is_enabled = True
            db.add(existing)
            return

        max_order = (
            db.query(func.max(models.ChildMediaPlanItem.order_index))
            .filter(models.ChildMediaPlanItem.child_id == child.id, models.ChildMediaPlanItem.module == module)
            .scalar()
        )
        next_order = (max_order or 0) + 1
        db.add(
            models.ChildMediaPlanItem(
                child_id=child.id,
                resource_id=resource_id,
                module=module,
                is_enabled=True,
                is_deleted=False,
                order_index=next_order,
            )
        )

    ensure_item(resource.id, req.module)

    if req.sync_pair and resource.pair_key:
        pair_type = "audio" if req.module == "video" else "video"
        paired = (
            db.query(models.MediaResource)
            .filter(models.MediaResource.pair_key == resource.pair_key, models.MediaResource.media_type == pair_type)
            .first()
        )
        if paired:
            ensure_item(paired.id, pair_type)

    db.commit()

    items = (
        db.query(models.ChildMediaPlanItem)
        .options(joinedload(models.ChildMediaPlanItem.resource))
        .filter(models.ChildMediaPlanItem.child_id == child.id, models.ChildMediaPlanItem.module == req.module)
        .order_by(models.ChildMediaPlanItem.order_index.asc(), models.ChildMediaPlanItem.added_at.asc())
        .all()
    )
    return items


@router.patch("/plan/{plan_item_id}", response_model=schemas.MediaPlanItemResponse)
def update_media_plan_item(
    plan_item_id: str,
    req: schemas.MediaPlanUpdateRequest,
    current_user: models.Parent = Depends(deps.get_current_parent),
    db: Session = Depends(get_db),
):
    item = (
        db.query(models.ChildMediaPlanItem)
        .options(joinedload(models.ChildMediaPlanItem.resource))
        .join(models.Child)
        .filter(models.ChildMediaPlanItem.id == plan_item_id, models.Child.parent_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Plan item not found")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.post("/session/start", response_model=schemas.MediaLearningSessionResponse)
def start_media_session(
    req: schemas.MediaLearningSessionStartRequest,
    current_child: models.Child = Depends(deps.get_current_child),
    db: Session = Depends(get_db),
):
    resource = db.query(models.MediaResource).filter(models.MediaResource.id == req.resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    plan_ok = (
        db.query(models.ChildMediaPlanItem)
        .filter(
            models.ChildMediaPlanItem.child_id == current_child.id,
            models.ChildMediaPlanItem.module == req.module,
            models.ChildMediaPlanItem.resource_id == req.resource_id,
            models.ChildMediaPlanItem.is_enabled.is_(True),
            models.ChildMediaPlanItem.is_deleted.is_(False),
        )
        .first()
    )
    if not plan_ok:
        raise HTTPException(status_code=403, detail="Resource not in active plan")

    progress = get_or_create_media_progress(db, child_id=current_child.id, module=req.module)
    session = models.MediaLearningSession(
        child_id=current_child.id,
        module=req.module,
        resource_id=req.resource_id,
        duration_seconds=0,
        completion_percent=0,
        completed_count=0,
        difficulty_level_at_time=progress.current_difficulty_level,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/session/{session_id}/finish", response_model=schemas.MediaLearningSessionResponse)
def finish_media_session(
    session_id: str,
    req: schemas.MediaLearningSessionFinishRequest,
    current_child: models.Child = Depends(deps.get_current_child),
    db: Session = Depends(get_db),
):
    session = (
        db.query(models.MediaLearningSession)
        .filter(models.MediaLearningSession.id == session_id, models.MediaLearningSession.child_id == current_child.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    completion_percent = float(max(0, min(100, req.completion_percent)))
    duration_seconds = max(0, int(req.duration_seconds))
    completed_count = max(0, int(req.completed_count or 0))

    session.ended_at = datetime.utcnow()
    session.duration_seconds = duration_seconds
    session.completion_percent = completion_percent
    session.completed_count = completed_count
    db.add(session)

    progress = get_or_create_media_progress(db, child_id=current_child.id, module=session.module)
    stats = dict(progress.stats or {})
    stats["total_seconds"] = int(stats.get("total_seconds", 0)) + duration_seconds
    stats["total_completed_count"] = int(stats.get("total_completed_count", 0)) + completed_count
    stats["total_session_count"] = int(stats.get("total_session_count", 0)) + 1
    stats["completion_percent_sum"] = float(stats.get("completion_percent_sum", 0.0)) + completion_percent

    eligible = completion_percent >= 80 and completed_count > 0
    if eligible:
        stats["eligible_completion_count"] = int(stats.get("eligible_completion_count", 0)) + 1

    settings = current_child.settings or {}
    auto_upgrade = bool(settings.get("auto_upgrade_media_difficulty", True))
    if auto_upgrade and int(stats.get("eligible_completion_count", 0)) >= 10 and progress.current_difficulty_level < 4:
        progress.current_difficulty_level += 1
        stats["eligible_completion_count"] = 0

    progress.stats = stats
    db.add(progress)

    db.commit()
    db.refresh(session)
    return session


@router.get("/report/summary", response_model=schemas.MediaReportSummary)
def get_media_report_summary(
    period: str,
    module: str,
    current_user: models.Parent = Depends(deps.get_current_parent),
    db: Session = Depends(get_db),
):
    child = get_default_child(db, current_user.id)
    start_dt, end_dt = normalize_period(period)

    sessions = (
        db.query(models.MediaLearningSession)
        .filter(
            models.MediaLearningSession.child_id == child.id,
            models.MediaLearningSession.module == module,
            models.MediaLearningSession.started_at >= start_dt,
            models.MediaLearningSession.started_at <= end_dt,
        )
        .all()
    )

    total_seconds = sum(int(s.duration_seconds or 0) for s in sessions)
    total_completed_count = sum(int(s.completed_count or 0) for s in sessions)
    completion_values = [float(s.completion_percent or 0) for s in sessions]
    average_completion_percent = sum(completion_values) / len(completion_values) if completion_values else 0.0

    top = (
        db.query(
            models.MediaLearningSession.resource_id.label("resource_id"),
            func.sum(models.MediaLearningSession.duration_seconds).label("total_seconds"),
            func.sum(models.MediaLearningSession.completed_count).label("completed_count"),
        )
        .filter(
            models.MediaLearningSession.child_id == child.id,
            models.MediaLearningSession.module == module,
            models.MediaLearningSession.started_at >= start_dt,
            models.MediaLearningSession.started_at <= end_dt,
        )
        .group_by(models.MediaLearningSession.resource_id)
        .order_by(func.sum(models.MediaLearningSession.duration_seconds).desc())
        .limit(5)
        .all()
    )
    resource_ids = [row.resource_id for row in top]
    resources = db.query(models.MediaResource).filter(models.MediaResource.id.in_(resource_ids)).all() if resource_ids else []
    resource_map = {r.id: r for r in resources}

    top_items: List[schemas.MediaReportTopItem] = []
    for row in top:
        r = resource_map.get(row.resource_id)
        title = r.filename if r else "Unknown"
        top_items.append(
            schemas.MediaReportTopItem(
                resource_id=row.resource_id,
                title=title,
                total_minutes=round((float(row.total_seconds or 0) / 60), 1),
                completed_count=int(row.completed_count or 0),
            )
        )

    progress = get_or_create_media_progress(db, child_id=child.id, module=module)
    difficulty_end = progress.current_difficulty_level
    difficulty_start = max(1, min(4, int(sessions[0].difficulty_level_at_time or difficulty_end))) if sessions else difficulty_end

    return schemas.MediaReportSummary(
        period=period,
        module=module,
        total_minutes=round(total_seconds / 60, 1),
        total_completed_count=total_completed_count,
        average_completion_percent=round(average_completion_percent, 1),
        top_items=top_items,
        difficulty_level_start=difficulty_start,
        difficulty_level_end=difficulty_end,
    )


@router.get("/report/days", response_model=List[schemas.MediaReportDayItem])
def get_media_report_days(
    module: str,
    period: str = "week",
    current_user: models.Parent = Depends(deps.get_current_parent),
    db: Session = Depends(get_db),
):
    child = get_default_child(db, current_user.id)
    start_dt, end_dt = normalize_period(period)

    rows = (
        db.query(
            func.date(models.MediaLearningSession.started_at).label("date"),
            func.sum(models.MediaLearningSession.duration_seconds).label("total_seconds"),
            func.sum(models.MediaLearningSession.completed_count).label("completed_count"),
            func.avg(models.MediaLearningSession.completion_percent).label("avg_completion"),
        )
        .filter(
            models.MediaLearningSession.child_id == child.id,
            models.MediaLearningSession.module == module,
            models.MediaLearningSession.started_at >= start_dt,
            models.MediaLearningSession.started_at <= end_dt,
        )
        .group_by(func.date(models.MediaLearningSession.started_at))
        .order_by(func.date(models.MediaLearningSession.started_at).asc())
        .all()
    )

    result: List[schemas.MediaReportDayItem] = []
    for r in rows:
        result.append(
            schemas.MediaReportDayItem(
                date=r.date if isinstance(r.date, date) else date.fromisoformat(str(r.date)),
                total_minutes=round((float(r.total_seconds or 0) / 60), 1),
                total_completed_count=int(r.completed_count or 0),
                average_completion_percent=round(float(r.avg_completion or 0), 1),
            )
        )
    return result


@router.get("/child/plan", response_model=List[schemas.MediaPlanItemResponse])
def list_child_media_plan(
    module: str,
    current_child: models.Child = Depends(deps.get_current_child),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.ChildMediaPlanItem)
        .options(joinedload(models.ChildMediaPlanItem.resource))
        .filter(
            models.ChildMediaPlanItem.child_id == current_child.id,
            models.ChildMediaPlanItem.module == module,
            models.ChildMediaPlanItem.is_enabled.is_(True),
            models.ChildMediaPlanItem.is_deleted.is_(False),
        )
        .order_by(models.ChildMediaPlanItem.order_index.asc(), models.ChildMediaPlanItem.added_at.asc())
        .all()
    )
