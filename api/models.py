from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Date, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Parent(Base):
    __tablename__ = "parents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    username = Column(String(100), nullable=False)
    avatar_url = Column(String(500), nullable=True) # Added avatar_url
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    children = relationship("Child", back_populates="parent", cascade="all, delete-orphan")
    words = relationship("Word", back_populates="parent", cascade="all, delete-orphan")

    __table_args__ = {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

class Child(Base):
    __tablename__ = "children"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    parent_id = Column(String(36), ForeignKey("parents.id"), nullable=False)
    nickname = Column(String(50), nullable=False)
    age = Column(Integer, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    settings = Column(JSON, default=lambda: {"daily_words": 20, "reminder_time": "19:00"})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    parent = relationship("Parent", back_populates="children")
    learning_records = relationship("LearningRecord", back_populates="child", cascade="all, delete-orphan")
    learning_sessions = relationship("LearningSession", back_populates="child", cascade="all, delete-orphan")
    media_plan_items = relationship("ChildMediaPlanItem", back_populates="child", cascade="all, delete-orphan")
    media_learning_sessions = relationship("MediaLearningSession", back_populates="child", cascade="all, delete-orphan")
    media_progress = relationship("ChildMediaProgress", back_populates="child", cascade="all, delete-orphan")

    __table_args__ = {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

class Dictionary(Base):
    __tablename__ = "dictionaries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    word = Column(String(100), unique=True, index=True, nullable=False)
    phonetic_us = Column(String(200), nullable=True)
    phonetic_uk = Column(String(200), nullable=True)
    meaning = Column(Text, nullable=False)
    example = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    audio_us_url = Column(String(500), nullable=True)
    audio_uk_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    words = relationship("Word", back_populates="dictionary")

    __table_args__ = {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

class Word(Base):
    __tablename__ = "words"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    parent_id = Column(String(36), ForeignKey("parents.id"), nullable=False)
    dictionary_id = Column(String(36), ForeignKey("dictionaries.id"), nullable=True)
    dict_vc_id = Column(String(32), index=True, nullable=True)
    category = Column(String(50), index=True, nullable=True)
    difficulty = Column(Integer, default=1, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    parent = relationship("Parent", back_populates="words")
    dictionary = relationship("Dictionary", back_populates="words")
    learning_records = relationship("LearningRecord", back_populates="word", cascade="all, delete-orphan")

    __table_args__ = {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    child_id = Column(String(36), ForeignKey("children.id"), nullable=False)
    session_date = Column(Date, index=True, nullable=False)
    target_words = Column(Integer, default=20)
    completed_words = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    child = relationship("Child", back_populates="learning_sessions")
    learning_records = relationship("LearningRecord", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

class LearningRecord(Base):
    __tablename__ = "learning_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    child_id = Column(String(36), ForeignKey("children.id"), nullable=False)
    word_id = Column(String(36), ForeignKey("words.id"), nullable=False)
    session_id = Column(String(36), ForeignKey("learning_sessions.id"), nullable=True)
    result = Column(String(20), nullable=True) # remembered / forgot
    time_spent = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    child = relationship("Child", back_populates="learning_records")
    word = relationship("Word", back_populates="learning_records")
    session = relationship("LearningSession", back_populates="learning_records")

    __table_args__ = {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

class MediaResource(Base):
    __tablename__ = "media_resources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    directory = Column(String(255), index=True, nullable=True)
    filename = Column(String(255), nullable=False)
    media_type = Column(String(20), index=True, nullable=False)  # video | audio
    size_mb = Column(Float, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    url = Column(String(1000), nullable=False)
    srt_file = Column(String(500), nullable=True)
    source_channel = Column(String(100), index=True, nullable=False, default="diegodad.com")
    difficulty_level = Column(Integer, index=True, nullable=False, default=1)
    location_type = Column(String(20), nullable=True)  # remote | local
    pair_key = Column(String(255), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    plan_items = relationship("ChildMediaPlanItem", back_populates="resource", cascade="all, delete-orphan")
    learning_sessions = relationship("MediaLearningSession", back_populates="resource", cascade="all, delete-orphan")

    __table_args__ = {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

class ChildMediaPlanItem(Base):
    __tablename__ = "child_media_plan_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    child_id = Column(String(36), ForeignKey("children.id"), nullable=False, index=True)
    resource_id = Column(String(36), ForeignKey("media_resources.id"), nullable=False, index=True)
    module = Column(String(20), nullable=False, index=True)  # video | audio
    is_enabled = Column(Boolean, nullable=False, default=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    order_index = Column(Integer, nullable=False, default=0)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    child = relationship("Child", back_populates="media_plan_items")
    resource = relationship("MediaResource", back_populates="plan_items")

    __table_args__ = {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

class MediaLearningSession(Base):
    __tablename__ = "media_learning_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    child_id = Column(String(36), ForeignKey("children.id"), nullable=False, index=True)
    module = Column(String(20), nullable=False, index=True)  # video | audio
    resource_id = Column(String(36), ForeignKey("media_resources.id"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=False, default=0)
    completion_percent = Column(Float, nullable=False, default=0)
    completed_count = Column(Integer, nullable=False, default=0)
    difficulty_level_at_time = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    child = relationship("Child", back_populates="media_learning_sessions")
    resource = relationship("MediaResource", back_populates="learning_sessions")

    __table_args__ = {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

class ChildMediaProgress(Base):
    __tablename__ = "child_media_progress"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    child_id = Column(String(36), ForeignKey("children.id"), nullable=False, index=True)
    module = Column(String(20), nullable=False, index=True)  # video | audio
    current_difficulty_level = Column(Integer, nullable=False, default=1)
    stats = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    child = relationship("Child", back_populates="media_progress")

    __table_args__ = {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}
