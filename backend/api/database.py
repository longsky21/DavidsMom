from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# 加载根目录下的 .env
# backend/api/database.py (3层) -> 回退3层到达根目录
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "davidsmom")
DICT_DB_NAME = os.getenv("DICT_DB_NAME") or os.getenv("DICTIONARY_DB_NAME") or "dictionarydata"

# 主数据库 (davidsmom)
SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

# 词典数据库 (dictionarydata)
DICTIONARY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DICT_DB_NAME}?charset=utf8mb4"
dictionary_engine = create_engine(DICTIONARY_DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
DictionarySessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=dictionary_engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_dict_db():
    db = DictionarySessionLocal()
    try:
        yield db
    finally:
        db.close()
