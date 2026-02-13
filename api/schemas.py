from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import uuid

# Auth Schemas
class ParentBase(BaseModel):
    phone: str
    username: str

class ParentCreate(ParentBase):
    password: str
    child_nickname: str

class ParentUpdate(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None # Actually Parent model doesn't have avatar_url yet, maybe we use Child's for display or add to Parent?
    # Based on requirement "Change parent avatar", we should probably add avatar to Parent model or use a specific field.
    # Looking at dashboard, it displays user.avatar_url. Let's check user store logic.
    # Assuming we want to update Parent info.

class ChildUpdate(BaseModel):
    nickname: Optional[str] = None
    age: Optional[int] = None
    avatar_url: Optional[str] = None

class ProfileUpdate(BaseModel):
    parent_username: Optional[str] = None
    child_nickname: Optional[str] = None
    child_age: Optional[int] = None
    child_avatar_url: Optional[str] = None
    # For now, let's assume parent avatar is not stored in DB or we use child avatar as the main visual?
    # Requirement says "Click parent avatar to change avatar". 
    # Let's add avatar_url to Parent model first if not exists.
    parent_avatar_url: Optional[str] = None

class ParentLogin(BaseModel):
    phone: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    avatar_url: Optional[str] = None

class ChildToken(BaseModel):
    access_token: str
    token_type: str
    child_id: str

class TokenData(BaseModel):
    phone: Optional[str] = None

# Child Schemas
class LearningSettings(BaseModel):
    daily_words: int = 20
    reminder_time: str = "19:00"
    difficulty_level: int = 1
    auto_adjust_difficulty: bool = True
    daily_video_minutes: int = 10
    daily_audio_minutes: int = 10
    daily_video_items: int = 1
    daily_audio_items: int = 1
    auto_upgrade_media_difficulty: bool = True

class ChildBase(BaseModel):
    nickname: str
    age: Optional[int] = None
    avatar_url: Optional[str] = None
    settings: Optional[LearningSettings] = None

class ChildCreate(ChildBase):
    pass

class ChildResponse(ChildBase):
    id: str
    parent_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Word Schemas
class WordCreate(BaseModel):
    word: str
    category: Optional[str] = None
    difficulty: int = 1
    # Allow override but typically not needed if we trust the dictionary
    meaning: Optional[str] = None
    phonetic_us: Optional[str] = None
    phonetic_uk: Optional[str] = None
    audio_us_url: Optional[str] = None
    audio_uk_url: Optional[str] = None
    image_url: Optional[str] = None
    example: Optional[str] = None

class WordResponse(BaseModel):
    id: str
    parent_id: str
    word: str
    meaning: str
    phonetic_us: Optional[str] = None
    phonetic_uk: Optional[str] = None
    example: Optional[str] = None
    image_url: Optional[str] = None
    audio_us_url: Optional[str] = None
    audio_uk_url: Optional[str] = None
    category: Optional[str] = None
    difficulty: int = 1
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

class LearningHistoryItem(BaseModel):
    date: date
    total_words: int
    completed_words: int
    duration_minutes: float
    has_words: bool = False
    has_video: bool = False
    has_audio: bool = False

class LearningDetailItem(BaseModel):
    word: str
    result: str
    time_spent: float
    created_at: datetime

class MediaSessionDetailItem(BaseModel):
    resource_title: str
    module: str
    duration_seconds: int
    completion_percent: float
    started_at: datetime

class LearningDayDetail(BaseModel):
    date: date
    summary: LearningHistoryItem
    records: List[LearningDetailItem]
    video_sessions: List[MediaSessionDetailItem] = []
    audio_sessions: List[MediaSessionDetailItem] = []

class MediaResourceResponse(BaseModel):
    id: str
    directory: Optional[str] = None
    filename: str
    media_type: str
    size_mb: Optional[float] = None
    duration_seconds: Optional[int] = None
    url: str
    source_channel: str
    difficulty_level: int
    location_type: Optional[str] = None
    pair_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MediaPlanItemResponse(BaseModel):
    id: str
    child_id: str
    module: str
    is_enabled: bool
    is_deleted: bool
    order_index: int
    added_at: datetime
    updated_at: datetime
    resource: MediaResourceResponse

    class Config:
        from_attributes = True

class MediaPlanAddRequest(BaseModel):
    resource_id: str
    module: str
    sync_pair: bool = False

class MediaPlanUpdateRequest(BaseModel):
    is_enabled: Optional[bool] = None
    is_deleted: Optional[bool] = None
    order_index: Optional[int] = None

class MediaLearningSessionStartRequest(BaseModel):
    resource_id: str
    module: str

class MediaLearningSessionFinishRequest(BaseModel):
    duration_seconds: int
    completion_percent: float
    completed_count: int = 1

class MediaLearningSessionResponse(BaseModel):
    id: str
    child_id: str
    module: str
    resource_id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: int
    completion_percent: float
    completed_count: int
    difficulty_level_at_time: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MediaReportTopItem(BaseModel):
    resource_id: str
    title: str
    total_minutes: float
    completed_count: int

class MediaReportSummary(BaseModel):
    period: str
    module: str
    total_minutes: float
    total_completed_count: int
    average_completion_percent: float
    top_items: List[MediaReportTopItem]
    difficulty_level_start: int
    difficulty_level_end: int

class MediaReportDayItem(BaseModel):
    date: date
    total_minutes: float
    total_completed_count: int
    average_completion_percent: float
