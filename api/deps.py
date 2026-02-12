from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from . import models, security
from .database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def _credentials_exception():
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    return credentials_exception


def get_current_parent(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = _credentials_exception()
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        role: str = payload.get("role") or "parent"
        if role != "parent":
            raise credentials_exception
        phone: str = payload.get("sub")
        if not phone:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.Parent).filter(models.Parent.phone == phone).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_child(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = _credentials_exception()
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        role: str = payload.get("role")
        if role != "child":
            raise credentials_exception
        child_id: str = payload.get("child_id")
        if not child_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    child = db.query(models.Child).filter(models.Child.id == child_id).first()
    if not child:
        raise credentials_exception
    return child


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    return get_current_parent(token=token, db=db)
