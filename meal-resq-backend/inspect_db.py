import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "meal_resq.db")
if not os.path.exists(db_path):
    print("Database file meal_resq.db not found!")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall()]

print("=================================================")
print("MEAL-RESQ SQLITE DATABASE INSPECTOR")
print(f" Database Path: {db_path}")
print("=================================================\n")


for table in tables:
    if table == "sqlite_sequence":
        continue
    print(f"------------ TABLE: {table.upper()} ------------")
    cursor.execute(f"PRAGMA table_info({table});")
    cols = [col[1] for col in cursor.fetchall()]
    print(f"Columns: {', '.join(cols)}")

    cursor.execute(f"SELECT * FROM {table};")
    rows = cursor.fetchall()
    print(f"Total Records: {len(rows)}")
    for r in rows:
        clean_r = tuple(str(val).encode('ascii', 'replace').decode('ascii') for val in r)
        print("  ", clean_r)
    print()


conn.close()
