import psycopg2

conn = psycopg2.connect(
    host="127.0.0.1",
    port=5432,
    database="chatdb",
    user="postgres",
    password="postgres"
)

cursor = conn.cursor()


def save_message(role, content):

    cursor.execute(
        """
        INSERT INTO messages(role, content)
        VALUES (%s, %s)
        """,
        (role, content)
    )

    conn.commit()


def load_messages():

    cursor.execute(
        """
        SELECT role, content
        FROM messages
        ORDER BY id
        """
    )

    rows = cursor.fetchall()

    history = []

    for role, content in rows:

        history.append(
            {
                "role": role,
                "content": content
            }
        )

    return history