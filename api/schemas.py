from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import uuid

# Auth Schemas
class ParentBase(BaseModel):
    phone: str
    name: str

class ParentCreate(ParentBase):
    password: str

class ParentLogin(BaseModel):
    phone: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    user_name: str

class TokenData(BaseModel):
    phone: Optional[str] = None

# Child Schemas
class ChildBase(BaseModel):
    nickname: str
    age: Optional[int] = None
    avatar_url: Optional[str] = None
    settings: Optional[dict] = {"daily_words": 20, "reminder_time": "19:00"}

class ChildCreate(ChildBase):
    pass

class ChildResponse(ChildBase):
    id: str
    parent_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Word Schemas
class WordBase(BaseModel):
    word: str
    phonetic_us: Optional[str] = None
    phonetic_uk: Optional[str] = None
    meaning: str
    example: Optional[str] = None
    category: Optional[str] = None
    difficulty: int = 1
    image_url: Optional[str] = None

class WordCreate(WordBase):
    pass

class WordResponse(WordBase):
    id: str
    parent_id: str
    image_source: Optional[str] = None
    audio_us_url: Optional[str] = None
    audio_uk_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Learning Schemas
class LearningRecordCreate(BaseModel):
    word_id: str
    session_id: Optional[str] = None
    result: str  # "remembered" or "forgot"
    time_spent: float

class LearningRecordResponse(LearningRecordCreate):
    id: str
    child_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class DailyTaskResponse(BaseModel):
    total_words: int
    learned_words: int
    remaining_words: int
    words: List[WordResponse]
