from .database import engine
from sqlalchemy import text

def inspect():
    with engine.connect() as conn:
        try:
            result = conn.execute(text("SHOW TABLES;"))
            tables = [row[0] for row in result]
            print(f"Tables: {tables}")
            
            for table in tables:
                print(f"--- Schema for {table} ---")
                try:
                    res = conn.execute(text(f"SHOW CREATE TABLE {table};"))
                    for row in res:
                        print(row[1])
                except Exception as e:
                    print(f"Error showing create table for {table}: {e}")
        except Exception as e:
            print(f"Error inspecting tables: {e}")

        try:
            result = conn.execute(text("SHOW VARIABLES LIKE 'character_set_server';"))
            for row in result:
                print(f"Server Charset: {row}")
            
            result = conn.execute(text("SHOW VARIABLES LIKE 'collation_server';"))
            for row in result:
                print(f"Server Collation: {row}")
                
            result = conn.execute(text("SHOW ENGINES;"))
            # Just print InnoDB status
            for row in result:
                if row[0] == 'InnoDB':
                    print(f"InnoDB: {row}")
        except Exception as e:
            print(f"Error checking variables: {e}")

if __name__ == "__main__":
    inspect()