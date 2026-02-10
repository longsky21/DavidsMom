from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from .. import models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
)

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
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": db_user.phone, "user_id": db_user.id}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": db_user.id,
        "username": db_user.username
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
        data={"sub": db_user.phone, "user_id": db_user.id}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": db_user.id,
        "username": db_user.username
    }
