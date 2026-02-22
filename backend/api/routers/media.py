from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from sqlalchemy import func, or_
import os
import shutil
from urllib.parse import urlparse
import requests
import tempfile
import mimetypes

from database import get_db
from models import MediaResource
from schemas import MediaResourceResponse, MediaResourceListResponse, BatchImportRequest, BatchImportResponse
from services import transcription

router = APIRouter(
    prefix="/media",
    tags=["media"],
)

# 获取项目根目录下的 public/subtitles 文件夹
# backend/api/routers/media.py (3层) -> 回退4层到达根目录
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
PUBLIC_SUBTITLES_DIR = os.path.join(PROJECT_ROOT, "public", "subtitles")
os.makedirs(PUBLIC_SUBTITLES_DIR, exist_ok=True)

@router.get("/", response_model=MediaResourceListResponse)
def list_media(
    page: int = 1,
    page_size: int = 20,
    q: Optional[str] = None,
    media_type: Optional[str] = None, # video | audio
    directory: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(MediaResource)
    
    if media_type:
        query = query.filter(MediaResource.media_type == media_type)
        
    if directory:
        query = query.filter(MediaResource.directory == directory)
        
    if q:
        query = query.filter(
            or_(
                MediaResource.filename.like(f"%{q}%"), 
                MediaResource.directory.like(f"%{q}%")
            )
        )

    # 排序：先按目录升序，再按文件名升序
    query = query.order_by(MediaResource.directory.asc(), MediaResource.filename.asc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.get("/directories", response_model=List[str])
def list_directories(media_type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MediaResource.directory).filter(MediaResource.directory.isnot(None))
    if media_type:
        query = query.filter(MediaResource.media_type == media_type)
    
    results = query.distinct().order_by(MediaResource.directory).all()
    return [r[0] for r in results if r[0]]

@router.get("/{media_id}/stream")
def stream_media(media_id: str, db: Session = Depends(get_db)):
    media = db.query(MediaResource).filter(MediaResource.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    video_path = media.url
    if video_path.startswith("file://"):
        video_path = video_path.replace("file://", "")
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    def iterfile():
        with open(video_path, mode="rb") as file_like:
            yield from file_like

    media_type = mimetypes.guess_type(video_path)[0] or "application/octet-stream"
    return StreamingResponse(iterfile(), media_type=media_type)

@router.post("/batch_import", response_model=BatchImportResponse)
def batch_import_media(req: BatchImportRequest, db: Session = Depends(get_db)):
    directory = req.directory
    media_type = req.media_type
    
    if not directory or not os.path.exists(directory):
        raise HTTPException(status_code=400, detail="Directory does not exist")
    
    count = 0
    skipped = 0
    
    try:
        for root, _dirs, files in os.walk(directory):
            for file in files:
                if file.startswith('.'): continue
                
                ext = os.path.splitext(file)[1].lower()
                if media_type == 'video' and ext not in ['.mp4', '.mov', '.avi', '.mkv']: continue
                if media_type == 'audio' and ext not in ['.mp3', '.wav', '.aac', '.m4a']: continue
                
                rel_dir = os.path.relpath(root, directory)
                if rel_dir == '.': rel_dir = os.path.basename(directory)
                
                existing = db.query(MediaResource).filter_by(
                    filename=file, 
                    directory=rel_dir,
                    media_type=media_type
                ).first()
                
                if existing:
                    skipped += 1
                    continue
                    
                url = f"file://{os.path.join(root, file)}"
                
                resource = MediaResource(
                    filename=file,
                    directory=rel_dir,
                    media_type=media_type,
                    url=url,
                    source_channel="local_import",
                    difficulty_level=1,
                    location_type="local"
                )
                db.add(resource)
                count += 1
        
        db.commit()
        return {
            "scanned_count": count + skipped,
            "added_count": count,
            "skipped_count": skipped,
            "message": f"Successfully scanned {directory}. Added {count} new resources."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def get_srt_path(media_directory: str, media_filename: str) -> tuple[str, str]:
    """
    Generate SRT storage path based on media directory.
    Returns: (absolute_file_path, relative_url_path)
    Path structure: public/subtitles/{media_directory}/{filename}.srt
    """
    # Sanitize directory name for safety
    safe_dir = "".join(c for c in media_directory if c.isalnum() or c in (' ', '.', '_', '-')).strip()
    if not safe_dir:
        safe_dir = "uncategorized"
        
    target_dir = os.path.join(PUBLIC_SUBTITLES_DIR, safe_dir)
    os.makedirs(target_dir, exist_ok=True)
    
    base_name = os.path.splitext(media_filename)[0]
    srt_filename = f"{base_name}.srt"
    
    abs_path = os.path.join(target_dir, srt_filename)
    # URL path relative to static mount
    # Note: We will mount /public -> public/ in main.py
    url_path = f"/public/subtitles/{safe_dir}/{srt_filename}"
    
    return abs_path, url_path

@router.post("/{media_id}/upload_srt")
async def upload_srt(
    media_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    media = db.query(MediaResource).filter(MediaResource.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
        
    if not file.filename.endswith('.srt'):
        raise HTTPException(status_code=400, detail="Only .srt files are allowed")

    # Get dynamic storage path
    filepath, srt_url = get_srt_path(media.directory or "unknown", media.filename)
    
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
        
    # Update DB
    media.srt_file = srt_url
    db.commit()
    
    return {"srt_file": srt_url}

def generate_srt_task(media_id: str, db_session_factory):
    """Background task for SRT generation"""
    # Create a new session for the background task
    db = db_session_factory()
    tmp_path = None
    try:
        media = db.query(MediaResource).filter(MediaResource.id == media_id).first()
        if not media:
            print(f"Media {media_id} not found for transcription")
            return

        print(f"Starting transcription for {media.filename}...")
        
        # Determine local path for transcription
        local_path = ""
        
        if media.url.startswith("file://"):
            local_path = media.url.replace("file://", "")
        else:
            # Handle remote URLs: Download to temporary file first
            print(f"Downloading remote file for transcription: {media.url}")
            try:
                suffix = os.path.splitext(media.filename)[1]
                if not suffix:
                    suffix = ".mp4" if media.media_type == "video" else ".mp3"
                    
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    with requests.get(media.url, stream=True) as r:
                        r.raise_for_status()
                        for chunk in r.iter_content(chunk_size=8192):
                            tmp.write(chunk)
                    tmp_path = tmp.name
                    local_path = tmp_path
            except Exception as e:
                print(f"Failed to download remote file: {str(e)}")
                return

        if not os.path.exists(local_path):
             print(f"File not found for transcription: {local_path}")
             return

        # Generate SRT content
        try:
            srt_content = transcription.transcribe_audio(local_path)
            
            # Get dynamic storage path
            filepath, srt_url = get_srt_path(media.directory or "unknown", media.filename)
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(srt_content)
                
            # Update DB
            media.srt_file = srt_url
            db.commit()
            print(f"Transcription completed for {media.filename}")
            
        except Exception as e:
            print(f"Transcription failed: {str(e)}")
            
    finally:
        # Clean up temporary file if created
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except:
                pass
        db.close()


@router.post("/{media_id}/generate_srt")
async def generate_srt(
    media_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    media = db.query(MediaResource).filter(MediaResource.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Allow remote URLs now as we handle them in background task
    # if not media.url.startswith("file://"):
    #      raise HTTPException(status_code=400, detail="Only local files are supported for auto-generation currently")

    from database import SessionLocal
    background_tasks.add_task(generate_srt_task, media_id, SessionLocal)
    
    return {"message": "Transcription task started in background"}
