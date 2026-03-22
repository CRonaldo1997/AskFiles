import psycopg2
import os

# Database connection details
DB_CONFIG = {
    "host": "db.njfdpfoumcceadtbdguh.supabase.co",
    "port": 5432,
    "user": "postgres",
    "password": "XT7cXxuCUYtUYGE2",
    "dbname": "postgres"
}

def migrate():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        print("Creating sessions table...")
        cur.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            username TEXT NOT NULL,
            doc_id UUID REFERENCES documents(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """)

        print("Adding session_id to chats table...")
        # Check if session_id column exists
        cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='chats' AND column_name='session_id';
        """)
        if not cur.fetchone():
            cur.execute("""
            ALTER TABLE chats ADD COLUMN session_id UUID REFERENCES sessions(id) ON DELETE CASCADE;
            """)
        
        # Optionally, migrate legacy data if needed. 
        # But we'll just keep them as NULL session_id for now.

        conn.commit()
        print("Migration successful.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
