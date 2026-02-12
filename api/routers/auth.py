from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from datetime import timedelta
import os
import shutil
import uuid
from .. import models, schemas, security, deps
from ..database import get_db

router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
)

# ... (register, update_profile, get_me, login)

@router.post("/upload", response_model=dict)
def upload_file(
    file: UploadFile = File(...),
    current_user: models.Parent = Depends(deps.get_current_user)
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_ext}"
    
    # Save file
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    file_path = os.path.join(uploads_dir, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save file")
    
    # Return URL (Assuming local dev environment)
    # In production, this should be a full URL or relative path handled by frontend
    # Here we return a relative path that matches the static mount in main.py
    return {"url": f"/uploads/{filename}"}

@router.post("/register", response_model=schemas.Token)
def register(user: schemas.ParentCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.Parent).filter(models.Parent.phone == user.phone).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    hashed_password = security.get_password_hash(user.password)
    db_user = models.Parent(
        phone=user.phone,
        username=user.username,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create default child
    db_child = models.Child(
        parent_id=db_user.id,
        nickname=user.child_nickname,
        age=6
    )
    db.add(db_child)
    db.commit()

    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": db_user.phone, "user_id": db_user.id, "role": "parent"}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": db_user.id,
        "username": db_user.username
    }

@router.put("/profile", response_model=schemas.Token)
def update_profile(
    profile_update: schemas.ProfileUpdate,
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    # Update Parent Info
    if profile_update.parent_username:
        current_user.username = profile_update.parent_username
    if profile_update.parent_avatar_url:
        current_user.avatar_url = profile_update.parent_avatar_url
    
    db.add(current_user)
    
    # Update Child Info (Default child for now)
    child = db.query(models.Child).filter(models.Child.parent_id == current_user.id).first()
    if child:
        if profile_update.child_nickname:
            child.nickname = profile_update.child_nickname
        if profile_update.child_age:
            child.age = profile_update.child_age
        if profile_update.child_avatar_url:
            child.avatar_url = profile_update.child_avatar_url
        db.add(child)
    
    db.commit()
    db.refresh(current_user)
    
    # Return new token/user info? Or just success?
    # Returning Token schema to refresh user state in frontend
    # Ideally we should have a /me endpoint but reusing token response for simplicity
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": current_user.phone, "user_id": current_user.id, "role": "parent"}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": current_user.id,
        "username": current_user.username
    }

@router.get("/me")
def get_current_user_profile(
    current_user: models.Parent = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    child = db.query(models.Child).filter(models.Child.parent_id == current_user.id).first()
    
    return {
        "parent": {
            "id": current_user.id,
            "username": current_user.username,
            "phone": current_user.phone,
            "avatar_url": current_user.avatar_url
        },
        "child": {
            "id": child.id if child else None,
            "nickname": child.nickname if child else None,
            "age": child.age if child else None,
            "avatar_url": child.avatar_url if child else None
        }
    }

@router.post("/login", response_model=schemas.Token)
def login(user: schemas.ParentLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.Parent).filter(models.Parent.phone == user.phone).first()
    if not db_user or not security.verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": db_user.phone, "user_id": db_user.id, "role": "parent"}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": db_user.id,
        "username": db_user.username,
        "avatar_url": db_user.avatar_url
    }


@router.post("/child-token", response_model=schemas.ChildToken)
def create_child_token(
    current_user: models.Parent = Depends(deps.get_current_parent),
    db: Session = Depends(get_db),
):
    child = db.query(models.Child).filter(models.Child.parent_id == current_user.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")

    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={
            "sub": f"child:{child.id}",
            "role": "child",
            "child_id": child.id,
            "parent_id": current_user.id,
        },
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer", "child_id": child.id}
