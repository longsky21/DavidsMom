from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
from sqlalchemy import func, or_, and_
import os
import uuid
import shutil

from database import get_dict_db
from models import WordExt
from schemas import WordExtResponse, WordListResponse, WordExtUpdate

router = APIRouter(
    prefix="/words",
    tags=["words"],
)

# 获取根目录下的 uploads 文件夹
# 修正路径层级：当前文件在 backend/api/routers/ (3层)，需要回退4层才能到达根目录
UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads"))

@router.get("/", response_model=WordListResponse)
def list_words(
    page: int = 1,
    page_size: int = 20,
    q: Optional[str] = None,
    missing_image: Optional[str] = None, # "missing" | "present"
    word_from: Optional[str] = None,
    difficulty: Optional[int] = None,
    db: Session = Depends(get_dict_db),
):
    query = db.query(WordExt)
    
    if q:
        query = query.filter(or_(WordExt.word.like(f"%{q}%"), WordExt.translation.like(f"%{q}%")))
    
    if missing_image == "missing":
        query = query.filter(or_(WordExt.image_url.is_(None), WordExt.image_url == ""))
    elif missing_image == "present":
        query = query.filter(and_(WordExt.image_url.isnot(None), WordExt.image_url != ""))
        
    if word_from:
        query = query.filter(WordExt.word_from == word_from)
        
    if difficulty:
        query = query.filter(WordExt.vc_difficulty == difficulty)

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.get("/sources", response_model=List[str])
def get_word_sources(db: Session = Depends(get_dict_db)):
    # 获取所有的 word_from 选项
    results = db.query(WordExt.word_from).distinct().filter(WordExt.word_from.isnot(None)).all()
    return [r[0] for r in results if r[0]]

@router.get("/{vc_id}", response_model=WordExtResponse)
def get_word(vc_id: str, db: Session = Depends(get_dict_db)):
    word = db.query(WordExt).filter(WordExt.vc_id == vc_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    return word

@router.put("/{vc_id}", response_model=WordExtResponse)
def update_word(vc_id: str, update_data: WordExtUpdate, db: Session = Depends(get_dict_db)):
    word = db.query(WordExt).filter(WordExt.vc_id == vc_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    
    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(word, key, value)
    
    db.commit()
    db.refresh(word)
    return word

@router.post("/{vc_id}/upload_image")
async def upload_word_image(
    vc_id: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_dict_db)
):
    word = db.query(WordExt).filter(WordExt.vc_id == vc_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
        
    if not os.path.exists(UPLOADS_DIR):
        os.makedirs(UPLOADS_DIR)
        
    # 生成安全文件名
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)
    
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
        
    # 更新数据库 URL
    # 注意：前端访问路径应该是 /uploads/{filename}，需要在 main.py 中 mount 静态目录
    image_url = f"/uploads/{filename}"
    word.image_url = image_url
    db.commit()
    
    return {"image_url": image_url}
