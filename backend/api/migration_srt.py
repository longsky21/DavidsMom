from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "davidsmom")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

def add_column():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            # 检查列是否存在
            result = conn.execute(text("SHOW COLUMNS FROM media_resources LIKE 'srt_file'"))
            if result.fetchone():
                print("Column 'srt_file' already exists.")
            else:
                print("Adding column 'srt_file' to 'media_resources' table...")
                conn.execute(text("ALTER TABLE media_resources ADD COLUMN srt_file VARCHAR(500) NULL"))
                conn.commit()
                print("Column added successfully.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
