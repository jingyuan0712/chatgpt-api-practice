import psycopg2

print("開始連線...")

conn = psycopg2.connect(
    host="127.0.0.1",
    port=5432,
    database="chatdb",
    user="postgres",
    password="postgres"
)

print("連線成功!")

cursor = conn.cursor()

cursor.execute("SELECT 1")

print(cursor.fetchone())