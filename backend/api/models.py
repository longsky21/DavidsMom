from sqlalchemy import Column, String, Text, Integer, Float, DateTime
from sqlalchemy.sql import func
from database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class WordExt(Base):
    __tablename__ = "word_ext"
    
    vc_id = Column(String(32), primary_key=True)
    image_url = Column(String(500), nullable=True)
    audio_uk_url = Column(String(500), nullable=True)
    audio_us_url = Column(String(500), nullable=True)
    example = Column(Text, nullable=True)
    youdao_translation = Column(Text, nullable=True)
    word_from = Column(String(100), nullable=True)
    word = Column(String(100), nullable=True)
    translation = Column(Text, nullable=True)
    vc_phonetic_uk = Column(String(100), nullable=True)
    vc_phonetic_us = Column(String(100), nullable=True)
    vc_difficulty = Column(Integer, nullable=True)

class MediaResource(Base):
    __tablename__ = "media_resources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    directory = Column(String(255), index=True, nullable=True)
    filename = Column(String(255), nullable=False)
    media_type = Column(String(20), index=True, nullable=False)
    size_mb = Column(Float, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    url = Column(String(1000), nullable=False)
    source_channel = Column(String(100), index=True, nullable=False, default="diegodad.com")
    difficulty_level = Column(Integer, index=True, nullable=False, default=1)
    location_type = Column(String(20), nullable=True)
    pair_key = Column(String(255), index=True, nullable=True)
    srt_file = Column(String(500), nullable=True)  # New field for SRT file path
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
