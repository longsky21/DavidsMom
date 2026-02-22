from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- Word Schemas ---

class WordExtBase(BaseModel):
    word: Optional[str] = None
    translation: Optional[str] = None
    vc_difficulty: Optional[int] = None
    image_url: Optional[str] = None
    audio_uk_url: Optional[str] = None
    audio_us_url: Optional[str] = None
    example: Optional[str] = None
    youdao_translation: Optional[str] = None
    word_from: Optional[str] = None
    vc_phonetic_uk: Optional[str] = None
    vc_phonetic_us: Optional[str] = None

class WordExtUpdate(WordExtBase):
    pass

class WordExtResponse(WordExtBase):
    vc_id: str

    class Config:
        from_attributes = True

class WordListResponse(BaseModel):
    items: List[WordExtResponse]
    total: int
    page: int
    page_size: int

# --- Media Resource Schemas ---

class MediaResourceBase(BaseModel):
    filename: str
    directory: Optional[str] = None
    media_type: str
    difficulty_level: int = 1
    url: str
    location_type: Optional[str] = None
    source_channel: str = "diegodad.com"
    srt_file: Optional[str] = None

class MediaResourceResponse(MediaResourceBase):
    id: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    size_mb: Optional[float] = None
    duration_seconds: Optional[int] = None
    
    class Config:
        from_attributes = True

class MediaResourceListResponse(BaseModel):
    items: List[MediaResourceResponse]
    total: int
    page: int
    page_size: int

class BatchImportRequest(BaseModel):
    directory: str
    media_type: str

class BatchImportResponse(BaseModel):
    scanned_count: int
    added_count: int
    skipped_count: int
    message: str

# --- Dashboard Schemas ---

class DashboardStats(BaseModel):
    total_words: int
    total_media: int
    total_video: int
    total_audio: int
    no_image_words: int
    local_image_words: int
    remote_image_words: int
    image_coverage: float

class ChartData(BaseModel):
    labels: List[str]
    values: List[int] # or float

class DashboardCharts(BaseModel):
    word_image: ChartData
    word_from: ChartData
    media_type: ChartData
    video_dir: ChartData
    audio_dir: ChartData
    media_location: ChartData
    media_trend: dict # specialized structure for trend (labels, video[], audio[])

class DashboardResponse(BaseModel):
    stats: DashboardStats
    charts: DashboardCharts
