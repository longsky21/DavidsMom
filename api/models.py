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
    name = Column(String(100), nullable=False)
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

    __table_args__ = {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

class Word(Base):
    __tablename__ = "words"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    parent_id = Column(String(36), ForeignKey("parents.id"), nullable=False)
    word = Column(String(100), index=True, nullable=False)
    phonetic_us = Column(String(200), nullable=True)
    phonetic_uk = Column(String(200), nullable=True)
    meaning = Column(Text, nullable=False)
    example = Column(Text, nullable=True)
    category = Column(String(50), index=True, nullable=True)
    difficulty = Column(Integer, default=1, index=True)
    image_url = Column(String(500), nullable=True)
    image_source = Column(String(50), default='api')
    audio_us_url = Column(String(500), nullable=True)
    audio_uk_url = Column(String(500), nullable=True)
    audio_source = Column(String(50), default='api')
    api_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    parent = relationship("Parent", back_populates="words")
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