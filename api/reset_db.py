from .database import engine, Base
from .models import *
from sqlalchemy import text

def reset():
    print("Dropping all tables...")
    with engine.connect() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        
        # Get all tables
        result = conn.execute(text("SHOW TABLES;"))
        tables = [row[0] for row in result]
        
        for table in tables:
            print(f"Dropping table {table}...")
            conn.execute(text(f"DROP TABLE IF EXISTS `{table}`;"))
            
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()
    
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Done!")

if __name__ == "__main__":
    reset()
