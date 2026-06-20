import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Global connection placeholder
_conn = None

def get_connection():
    """
    Returns an active database connection. 
    Reconnects automatically if the connection is closed or has dropped.
    """
    global _conn
    if _conn is None or _conn.closed != 0:
        print("Re-establishing closed database connection...")
        _conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", 5432)),
            database=os.getenv("DB_NAME", "chatdb"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "postgres")
        )
    return _conn

def init_db():
    """
    Initializes the database schema.
    If the tables do not exist, they are created.
    If 'messages' table exists but is missing 'conversation_id', it drops and recreates tables.
    """
    conn = get_connection()
    with conn.cursor() as cur:
        # Check if conversations table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'conversations'
            );
        """)
        conversations_exist = cur.fetchone()[0]
        
        # Check if messages table exists and has conversation_id column
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'messages'
            );
        """)
        messages_exist = cur.fetchone()[0]
        
        messages_needs_recreate = False
        if messages_exist:
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name='messages' AND column_name='conversation_id'
                );
            """)
            messages_needs_recreate = not cur.fetchone()[0]
            
        if not conversations_exist or messages_needs_recreate:
            print("Migrating/Initializing database tables...")
            if messages_exist:
                cur.execute("DROP TABLE IF EXISTS messages;")
            cur.execute("DROP TABLE IF EXISTS conversations;")
            
            cur.execute("""
                CREATE TABLE conversations (
                    id SERIAL PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE messages (
                    id SERIAL PRIMARY KEY,
                    conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                    role VARCHAR(20) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()
            print("Database tables initialized successfully.")
        else:
            print("Database schema is up to date.")

def create_conversation(title="New Chat"):
    """
    Creates a new conversation and returns its basic info.
    """
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO conversations(title)
            VALUES (%s)
            RETURNING id, title, created_at
            """,
            (title,)
        )
        row = cursor.fetchone()
        conn.commit()
        return {"id": row[0], "title": row[1], "created_at": row[2]}

def load_conversations():
    """
    Loads all conversations, sorted by creation date descending.
    """
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, title, created_at
            FROM conversations
            ORDER BY created_at DESC, id DESC
            """
        )
        rows = cursor.fetchall()
        conversations = []
        for id, title, created_at in rows:
            conversations.append({
                "id": id,
                "title": title,
                "created_at": created_at.isoformat() if created_at else None
            })
        return conversations

def save_message(conversation_id, role, content):
    """
    Saves a message associated with a conversation.
    """
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO messages(conversation_id, role, content)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (conversation_id, role, content)
        )
        row = cursor.fetchone()
        conn.commit()
        return row[0] if row else None

def load_messages(conversation_id):
    """
    Loads all messages for a specific conversation, sorted chronologically.
    Returns id, role, content.
    """
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, role, content
            FROM messages
            WHERE conversation_id = %s
            ORDER BY id
            """,
            (conversation_id,)
        )
        rows = cursor.fetchall()
        history = []
        for id, role, content in rows:
            history.append({
                "id": id,
                "role": role,
                "content": content
            })
        return history

def update_conversation_title(conversation_id, title):
    """
    Updates the title of an existing conversation.
    """
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE conversations
            SET title = %s
            WHERE id = %s
            """,
            (title, conversation_id)
        )
        conn.commit()

def get_message_count(conversation_id):
    """
    Gets the count of messages in a conversation.
    """
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) FROM messages WHERE conversation_id = %s
            """,
            (conversation_id,)
        )
        return cursor.fetchone()[0]

def delete_conversation(conversation_id):
    """
    Deletes a conversation from PostgreSQL. 
    Foreign keys set to ON DELETE CASCADE will handle associated messages automatically.
    """
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM conversations WHERE id = %s
            """,
            (conversation_id,)
        )
        conn.commit()

def edit_message(conversation_id, message_id, new_content):
    """
    Updates the content of a user message and deletes all subsequent messages.
    """
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE messages
            SET content = %s
            WHERE id = %s AND conversation_id = %s
            """,
            (new_content, message_id, conversation_id)
        )
        cursor.execute(
            """
            DELETE FROM messages
            WHERE conversation_id = %s AND id > %s
            """,
            (conversation_id, message_id)
        )
        conn.commit()

def delete_last_assistant_message(conversation_id):
    """
    Deletes the last message in a conversation if it is an assistant response.
    """
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, role
            FROM messages
            WHERE conversation_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (conversation_id,)
        )
        row = cursor.fetchone()
        if row:
            last_id, last_role = row
            if last_role == 'assistant':
                cursor.execute(
                    """
                    DELETE FROM messages
                    WHERE id = %s
                    """,
                    (last_id,)
                )
                conn.commit()
                return True
        return False