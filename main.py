import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

"""
main.py — Main Flask application for Smart College Assistant
Combines: Chatbot + Face Recognition + Role-Based Access
Run: python main.py
"""

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from datetime import datetime, date
import sqlite3
import hashlib
import os
import pickle
import numpy as np

# ── optional face recognition ──────────────────────────────────────────────
try:
    import face_recognition
    import cv2
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("⚠️  face_recognition not available — face login disabled")

# ── optional chatbot ────────────────────────────────────────────────────────

try:
    from chatbot.predictor import predict_intent
    from chatbot.response import get_response
    CHATBOT_AVAILABLE = True
    print("✅ Chatbot loaded successfully")
except ImportError:
    CHATBOT_AVAILABLE = False
    print("⚠️  Chatbot module not found")

app = Flask(__name__)
app.secret_key = os.urandom(24)
CORS(app, supports_credentials=True)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "college.db")


# ════════════════════════════════════════════════════════════════════════════
# DATABASE
# ════════════════════════════════════════════════════════════════════════════

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        roll_number TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        department TEXT DEFAULT 'General',
        face_encoding BLOB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        roll_number TEXT NOT NULL,
        subject TEXT DEFAULT 'General',
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT DEFAULT 'present',
        marked_by INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(roll_number, subject, date)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        marks_obtained REAL NOT NULL,
        total_marks REAL NOT NULL DEFAULT 100,
        grade TEXT,
        semester TEXT,
        uploaded_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        target_role TEXT DEFAULT 'student',
        priority TEXT DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        month TEXT,
        year TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        reminder_date TEXT NOT NULL,
        reminder_time TEXT,
        is_done INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )""")

    conn.commit()

    # Seed demo data if empty
    c.execute("SELECT COUNT(*) as cnt FROM users")
    if c.fetchone()["cnt"] == 0:
        _seed_demo_data(c)
        conn.commit()

    conn.close()
    print("✅ Database initialized.")


def _hash(password):
    return hashlib.sha256(password.encode()).hexdigest()


def _grade_from_marks(obtained, total):
    pct = (obtained / total) * 100
    if pct >= 90: return "A+"
    if pct >= 80: return "A"
    if pct >= 70: return "B+"
    if pct >= 60: return "B"
    if pct >= 50: return "C"
    if pct >= 40: return "D"
    return "F"


def _seed_demo_data(c):
    """Insert demo faculty and students."""
    # Faculty
    c.execute("INSERT INTO users (name, roll_number, email, password_hash, role, department) VALUES (?,?,?,?,?,?)",
              ("Dr. Sharma", "FAC001", "sharma@college.edu", _hash("faculty123"), "faculty", "Computer Science"))

    # Students
    students = [
        ("Rahul Verma", "STU001", "rahul@college.edu", "student123", "Computer Science"),
        ("Priya Singh", "STU002", "priya@college.edu", "student123", "Computer Science"),
        ("Amit Kumar", "STU003", "amit@college.edu", "student123", "Information Technology"),
    ]
    for name, roll, email, pwd, dept in students:
        c.execute("INSERT INTO users (name, roll_number, email, password_hash, role, department) VALUES (?,?,?,?,?,?)",
                  (name, roll, email, _hash(pwd), "student", dept))

    # Demo grades
    subjects = ["Mathematics", "Python Programming", "Data Structures", "DBMS", "Networks"]
    import random
    random.seed(42)
    for student_roll in ["STU001", "STU002", "STU003"]:
        c.execute("SELECT id FROM users WHERE roll_number=?", (student_roll,))
        sid = c.fetchone()["id"]
        for subj in subjects:
            marks = random.randint(55, 95)
            grade = _grade_from_marks(marks, 100)
            c.execute("INSERT INTO grades (student_id, subject, marks_obtained, total_marks, grade, semester) VALUES (?,?,?,?,?,?)",
                      (sid, subj, marks, 100, grade, "Semester 3"))

    # Demo attendance
    today = date.today().isoformat()
    for student_roll in ["STU001", "STU002"]:
        c.execute("SELECT id, name FROM users WHERE roll_number=?", (student_roll,))
        row = c.fetchone()
        c.execute("INSERT OR IGNORE INTO attendance (user_id, name, roll_number, subject, date, time, status) VALUES (?,?,?,?,?,?,?)",
                  (row["id"], row["name"], student_roll, "General", today, "09:00:00", "present"))

    # Demo announcement
    c.execute("SELECT id FROM users WHERE role='faculty' LIMIT 1")
    fac = c.fetchone()
    c.execute("INSERT INTO announcements (title, content, created_by, target_role, priority) VALUES (?,?,?,?,?)",
              ("Welcome to Smart College Assistant", "Dear students, the portal is now live. Please check your attendance and grades regularly.", fac["id"], "student", "high"))
    c.execute("INSERT INTO announcements (title, content, created_by, target_role, priority) VALUES (?,?,?,?,?)",
              ("Exam Schedule Released", "Mid-term exams will be held from next Monday. Timetable is available on the portal.", fac["id"], "student", "high"))

    print("✅ Demo data seeded.")


# ════════════════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════════════════

def current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    conn = get_db()
    user = conn.execute("SELECT id, name, roll_number, role, department FROM users WHERE id=?", (uid,)).fetchone()
    conn.close()
    return dict(user) if user else None


def require_auth(role=None):
    user = current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    if role and user["role"] != role:
        return jsonify({"error": "Access denied"}), 403
    return None


# ════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ════════════════════════════════════════════════════════════════════════════

@app.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    roll = (data.get("roll_number") or "").strip()
    password = (data.get("password") or "").strip()

    if not roll or not password:
        return jsonify({"error": "Roll number and password are required"}), 400

    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE roll_number=? AND password_hash=?",
        (roll, _hash(password))
    ).fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid roll number or password"}), 401

    session["user_id"] = user["id"]
    return jsonify({
        "success": True,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "roll_number": user["roll_number"],
            "role": user["role"],
            "department": user["department"],
        }
    })


@app.post("/auth/logout")
def logout():
    session.clear()
    return jsonify({"success": True})


@app.get("/auth/me")
def me():
    user = current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify({"user": user})


# ════════════════════════════════════════════════════════════════════════════
# STUDENT ROUTES
# ════════════════════════════════════════════════════════════════════════════
@app.post("/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    roll_number = (data.get("roll_number") or "").strip()
    password = (data.get("password") or "").strip()
    role = (data.get("role") or "student").strip()
    department = (data.get("department") or "General").strip()
    image_b64 = data.get("image")

    if not all([name, roll_number, password, image_b64]):
        return jsonify({"error": "All fields including face image are required"}), 400

    # Check duplicate
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE roll_number = ?", (roll_number,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"error": f"Roll number '{roll_number}' is already registered"}), 409
    conn.close()

    # Process face image
    if FACE_RECOGNITION_AVAILABLE:
        try:
            import base64
            import cv2
            import face_recognition
            import pickle as pkl

            if "," in image_b64:
                image_b64 = image_b64.split(",")[1]
            img_bytes = base64.b64decode(image_b64)
            img_array = np.frombuffer(img_bytes, dtype=np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb_img)

            if not face_locations:
                return jsonify({"error": "No face detected. Please try again."}), 400
            if len(face_locations) > 1:
                return jsonify({"error": "Multiple faces detected. Please ensure only one face is visible."}), 400

            encodings = face_recognition.face_encodings(rgb_img, face_locations)
            if not encodings:
                return jsonify({"error": "Could not process face. Please try again."}), 400

            encoding_blob = pkl.dumps(encodings[0])
        except Exception as e:
            return jsonify({"error": f"Face processing error: {str(e)}"}), 500
    else:
        encoding_blob = None

    # Save user
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (name, roll_number, password_hash, role, department, face_encoding) VALUES (?,?,?,?,?,?)",
            (name, roll_number, _hash(password), role, department, encoding_blob)
        )
        conn.commit()
        return jsonify({"success": True, "message": f"{name} registered successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.post("/auth/face-login")
def face_login():
    if not FACE_RECOGNITION_AVAILABLE:
        return jsonify({"error": "Face recognition not available on this server"}), 503

    data = request.get_json(silent=True) or {}
    image_b64 = data.get("image")
    if not image_b64:
        return jsonify({"error": "image is required"}), 400

    try:
        import base64
        import cv2
        import face_recognition
        import pickle as pkl

        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
        img_bytes = base64.b64decode(image_b64)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Load known faces
        conn = get_db()
        rows = conn.execute("SELECT id, name, roll_number, role, department, face_encoding FROM users WHERE face_encoding IS NOT NULL").fetchall()
        conn.close()

        if not rows:
            return jsonify({"recognized": False, "message": "No registered faces found"}), 200

        known_encodings = [pkl.loads(r["face_encoding"]) for r in rows]

        face_locations = face_recognition.face_locations(rgb_img)
        if not face_locations:
            return jsonify({"recognized": False, "message": "No face detected. Please try again."}), 200

        face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
        if not face_encodings:
            return jsonify({"recognized": False, "message": "Could not process face."}), 200

        distances = face_recognition.face_distance(known_encodings, face_encodings[0])
        best_idx = int(np.argmin(distances))
        best_distance = float(distances[best_idx])

        if best_distance >= 0.50:
            return jsonify({"recognized": False, "message": "Face not recognized. Please use credentials or register first."}), 200

        user = rows[best_idx]
        session["user_id"] = user["id"]

        return jsonify({
            "recognized": True,
            "message": f"Welcome {user['name']}!",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "roll_number": user["roll_number"],
                "role": user["role"],
                "department": user["department"],
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.get("/student/dashboard")
def student_dashboard():
    err = require_auth("student")
    if err: return err
    user = current_user()

    conn = get_db()

    # Attendance summary
    att = conn.execute(
        "SELECT COUNT(*) as total FROM attendance WHERE roll_number=? AND status='present'",
        (user["roll_number"],)
    ).fetchone()

    # Total working days
    days = conn.execute("SELECT COUNT(DISTINCT date) as total FROM attendance").fetchone()

    # Grades
    grades = conn.execute(
        "SELECT subject, marks_obtained, total_marks, grade, semester FROM grades WHERE student_id=? ORDER BY subject",
        (user["id"],)
    ).fetchall()

    # Announcements
    announcements = conn.execute(
        "SELECT a.title, a.content, a.priority, a.created_at, u.name as faculty_name FROM announcements a JOIN users u ON a.created_by=u.id WHERE a.target_role='student' ORDER BY a.created_at DESC LIMIT 10"
    ).fetchall()

    # Upcoming reminders
    today = date.today().isoformat()
    reminders = conn.execute(
        "SELECT * FROM reminders WHERE user_id=? AND is_done=0 AND reminder_date >= ? ORDER BY reminder_date LIMIT 5",
        (user["id"], today)
    ).fetchall()

    # Todos
    todos = conn.execute(
        "SELECT * FROM todos WHERE user_id=? AND status='pending' ORDER BY due_date LIMIT 10",
        (user["id"],)
    ).fetchall()

    conn.close()

    total_days = days["total"] or 1
    present_days = att["total"]
    attendance_pct = round((present_days / total_days) * 100, 1)

    return jsonify({
        "user": user,
        "attendance": {
            "present": present_days,
            "total": total_days,
            "percentage": attendance_pct,
            "eligible": attendance_pct >= 75
        },
        "grades": [dict(g) for g in grades],
        "announcements": [dict(a) for a in announcements],
        "reminders": [dict(r) for r in reminders],
        "todos": [dict(t) for t in todos],
    })


@app.get("/student/attendance")
def student_attendance():
    err = require_auth("student")
    if err: return err
    user = current_user()

    conn = get_db()
    records = conn.execute(
        "SELECT date, time, subject, status FROM attendance WHERE roll_number=? ORDER BY date DESC",
        (user["roll_number"],)
    ).fetchall()
    conn.close()

    return jsonify({"records": [dict(r) for r in records]})


# ════════════════════════════════════════════════════════════════════════════
# FACULTY ROUTES
# ════════════════════════════════════════════════════════════════════════════

@app.get("/faculty/dashboard")
def faculty_dashboard():
    err = require_auth("faculty")
    if err: return err
    user = current_user()

    conn = get_db()

    # All students
    students = conn.execute(
        "SELECT id, name, roll_number, department FROM users WHERE role='student' ORDER BY name"
    ).fetchall()

    # Today's attendance
    today = date.today().isoformat()
    today_att = conn.execute(
        "SELECT name, roll_number, time, status FROM attendance WHERE date=? ORDER BY time",
        (today,)
    ).fetchall()

    # Attendance summary per student
    total_days = conn.execute("SELECT COUNT(DISTINCT date) as t FROM attendance").fetchone()["t"] or 1
    summary = []
    for s in students:
        present = conn.execute(
            "SELECT COUNT(*) as cnt FROM attendance WHERE roll_number=? AND status='present'",
            (s["roll_number"],)
        ).fetchone()["cnt"]
        pct = round((present / total_days) * 100, 1)
        summary.append({
            "id": s["id"],
            "name": s["name"],
            "roll_number": s["roll_number"],
            "department": s["department"],
            "present": present,
            "total": total_days,
            "percentage": pct,
            "eligible": pct >= 75
        })

    # Todos
    todos = conn.execute(
        "SELECT * FROM todos WHERE user_id=? ORDER BY due_date LIMIT 10",
        (user["id"],)
    ).fetchall()

    conn.close()

    return jsonify({
        "user": user,
        "students": summary,
        "today_attendance": [dict(a) for a in today_att],
        "today_date": today,
        "todos": [dict(t) for t in todos],
    })


@app.post("/faculty/attendance/mark")
def mark_attendance():
    err = require_auth("faculty")
    if err: return err
    user = current_user()
    data = request.get_json(silent=True) or {}

    roll = (data.get("roll_number") or "").strip()
    subject = (data.get("subject") or "General").strip()
    status = (data.get("status") or "present").strip()
    att_date = data.get("date") or date.today().isoformat()

    if not roll:
        return jsonify({"error": "roll_number is required"}), 400

    conn = get_db()
    student = conn.execute("SELECT id, name FROM users WHERE roll_number=?", (roll,)).fetchone()
    if not student:
        conn.close()
        return jsonify({"error": "Student not found"}), 404

    time_now = datetime.now().strftime("%H:%M:%S")
    try:
        conn.execute(
            "INSERT OR REPLACE INTO attendance (user_id, name, roll_number, subject, date, time, status, marked_by) VALUES (?,?,?,?,?,?,?,?)",
            (student["id"], student["name"], roll, subject, att_date, time_now, status, user["id"])
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": f"Attendance marked for {student['name']}"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500


@app.post("/faculty/grades/upload")
def upload_grades():
    err = require_auth("faculty")
    if err: return err
    user = current_user()
    data = request.get_json(silent=True) or {}

    roll = (data.get("roll_number") or "").strip()
    subject = (data.get("subject") or "").strip()
    marks = data.get("marks_obtained")
    total = data.get("total_marks", 100)
    semester = data.get("semester", "Current Semester")

    if not all([roll, subject, marks]):
        return jsonify({"error": "roll_number, subject and marks_obtained are required"}), 400

    conn = get_db()
    student = conn.execute("SELECT id FROM users WHERE roll_number=?", (roll,)).fetchone()
    if not student:
        conn.close()
        return jsonify({"error": "Student not found"}), 404

    grade = _grade_from_marks(float(marks), float(total))
    try:
        conn.execute(
            "INSERT OR REPLACE INTO grades (student_id, subject, marks_obtained, total_marks, grade, semester, uploaded_by) VALUES (?,?,?,?,?,?,?)",
            (student["id"], subject, marks, total, grade, semester, user["id"])
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True, "grade": grade, "message": "Grades uploaded successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500


@app.post("/faculty/announcement")
def post_announcement():
    err = require_auth("faculty")
    if err: return err
    user = current_user()
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    target = data.get("target_role", "student")
    priority = data.get("priority", "normal")

    if not title or not content:
        return jsonify({"error": "title and content are required"}), 400

    conn = get_db()
    conn.execute(
        "INSERT INTO announcements (title, content, created_by, target_role, priority) VALUES (?,?,?,?,?)",
        (title, content, user["id"], target, priority)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Announcement posted successfully"})


# ════════════════════════════════════════════════════════════════════════════
# TODOS & REMINDERS (Both Roles)
# ════════════════════════════════════════════════════════════════════════════

@app.get("/todos")
def get_todos():
    err = require_auth()
    if err: return err
    user = current_user()
    month = request.args.get("month")
    year = request.args.get("year")

    conn = get_db()
    query = "SELECT * FROM todos WHERE user_id=?"
    params = [user["id"]]
    if month: query += " AND month=?"; params.append(month)
    if year: query += " AND year=?"; params.append(year)
    query += " ORDER BY due_date"

    todos = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify({"todos": [dict(t) for t in todos]})


@app.post("/todos")
def add_todo():
    err = require_auth()
    if err: return err
    user = current_user()
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title is required"}), 400

    due_date = data.get("due_date", "")
    month = data.get("month", datetime.now().strftime("%B"))
    year = data.get("year", str(datetime.now().year))

    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO todos (user_id, title, description, due_date, month, year, priority) VALUES (?,?,?,?,?,?,?)",
        (user["id"], title, data.get("description", ""), due_date, month, year, data.get("priority", "normal"))
    )
    todo_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"success": True, "id": todo_id})


@app.patch("/todos/<int:todo_id>")
def update_todo(todo_id):
    err = require_auth()
    if err: return err
    user = current_user()
    data = request.get_json(silent=True) or {}

    conn = get_db()
    todo = conn.execute("SELECT * FROM todos WHERE id=? AND user_id=?", (todo_id, user["id"])).fetchone()
    if not todo:
        conn.close()
        return jsonify({"error": "Todo not found"}), 404

    status = data.get("status", todo["status"])
    title = data.get("title", todo["title"])
    conn.execute("UPDATE todos SET status=?, title=? WHERE id=?", (status, title, todo_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.delete("/todos/<int:todo_id>")
def delete_todo(todo_id):
    err = require_auth()
    if err: return err
    user = current_user()
    conn = get_db()
    conn.execute("DELETE FROM todos WHERE id=? AND user_id=?", (todo_id, user["id"]))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.get("/reminders")
def get_reminders():
    err = require_auth()
    if err: return err
    user = current_user()
    conn = get_db()
    reminders = conn.execute(
        "SELECT * FROM reminders WHERE user_id=? ORDER BY reminder_date, reminder_time",
        (user["id"],)
    ).fetchall()
    conn.close()
    return jsonify({"reminders": [dict(r) for r in reminders]})


@app.post("/reminders")
def add_reminder():
    err = require_auth()
    if err: return err
    user = current_user()
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    reminder_date = (data.get("reminder_date") or "").strip()
    if not title or not reminder_date:
        return jsonify({"error": "title and reminder_date are required"}), 400

    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO reminders (user_id, title, reminder_date, reminder_time) VALUES (?,?,?,?)",
        (user["id"], title, reminder_date, data.get("reminder_time", ""))
    )
    rid = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"success": True, "id": rid})


@app.patch("/reminders/<int:rid>")
def update_reminder(rid):
    err = require_auth()
    if err: return err
    user = current_user()
    data = request.get_json(silent=True) or {}
    conn = get_db()
    conn.execute(
        "UPDATE reminders SET is_done=? WHERE id=? AND user_id=?",
        (data.get("is_done", 0), rid, user["id"])
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# ════════════════════════════════════════════════════════════════════════════
# ANALYTICS ROUTES
# ════════════════════════════════════════════════════════════════════════════

@app.get("/student/analytics")
def student_analytics():
    err = require_auth("student")
    if err: return err
    user = current_user()
    conn = get_db()

    # Grades data for bar chart
    grades = conn.execute(
        "SELECT subject, marks_obtained, total_marks FROM grades WHERE student_id=?",
        (user["id"],)
    ).fetchall()

    grades_data = [{
        "subject": g["subject"][:10],  # truncate for chart
        "marks": g["marks_obtained"],
        "total": g["total_marks"],
        "percentage": round((g["marks_obtained"] / g["total_marks"]) * 100, 1)
    } for g in grades]

    # Class average per subject
    class_avg = []
    for g in grades:
        avg = conn.execute(
            "SELECT AVG(marks_obtained) as avg FROM grades WHERE subject=?",
            (g["subject"],)
        ).fetchone()["avg"]
        class_avg.append({
            "subject": g["subject"][:10],
            "your_marks": g["marks_obtained"],
            "class_avg": round(avg, 1)
        })

    # Attendance by month
    attendance_records = conn.execute(
        "SELECT date, status FROM attendance WHERE roll_number=? ORDER BY date",
        (user["roll_number"],)
    ).fetchall()

    # Group by month
    monthly = {}
    for r in attendance_records:
        month = r["date"][:7]  # YYYY-MM
        if month not in monthly:
            monthly[month] = {"present": 0, "absent": 0}
        if r["status"] == "present":
            monthly[month]["present"] += 1
        else:
            monthly[month]["absent"] += 1

    monthly_data = [{"month": k, "present": v["present"], "absent": v["absent"]} for k, v in sorted(monthly.items())]

    conn.close()
    return jsonify({
        "grades_data": grades_data,
        "class_comparison": class_avg,
        "monthly_attendance": monthly_data
    })



# ════════════════════════════════════════════════════════════════════════════
# CHATBOT
# ════════════════════════════════════════════════════════════════════════════
# ════════════════════════════════════════════════════════════════════════════
# ANALYTICS ROUTES
# ════════════════════════════════════════════════════════════════════════════



@app.get("/faculty/analytics")
def faculty_analytics():
    err = require_auth("faculty")
    if err: return err

    conn = get_db()

    # All students with attendance percentage
    students = conn.execute(
        "SELECT id, name, roll_number FROM users WHERE role='student'"
    ).fetchall()

    total_days = conn.execute("SELECT COUNT(DISTINCT date) as t FROM attendance").fetchone()["t"] or 1

    student_data = []
    for s in students:
        present = conn.execute(
            "SELECT COUNT(*) as cnt FROM attendance WHERE roll_number=? AND status='present'",
            (s["roll_number"],)
        ).fetchone()["cnt"]
        pct = round((present / total_days) * 100, 1)
        student_data.append({
            "name": s["name"].split()[0],  # first name only for chart
            "attendance": pct,
            "status": "safe" if pct >= 75 else "warning" if pct >= 60 else "danger"
        })

    # Subject wise class average
    subjects = conn.execute("SELECT DISTINCT subject FROM grades").fetchall()
    subject_avg = []
    for subj in subjects:
        avg = conn.execute(
            "SELECT AVG(marks_obtained) as avg, COUNT(*) as cnt FROM grades WHERE subject=?",
            (subj["subject"],)
        ).fetchone()
        subject_avg.append({
            "subject": subj["subject"][:12],
            "average": round(avg["avg"], 1),
            "students": avg["cnt"]
        })

    # Attendance distribution
    safe = sum(1 for s in student_data if s["status"] == "safe")
    warning = sum(1 for s in student_data if s["status"] == "warning")
    danger = sum(1 for s in student_data if s["status"] == "danger")

    conn.close()
    return jsonify({
        "student_attendance": student_data,
        "subject_averages": subject_avg,
        "attendance_distribution": [
            {"name": "Safe (75%+)", "value": safe, "color": "#10b981"},
            {"name": "Warning (60-75%)", "value": warning, "color": "#f59e0b"},
            {"name": "Danger (<60%)", "value": danger, "color": "#ef4444"},
        ]
    })
@app.get("/student/marks-calculator")
def marks_calculator():
    err = require_auth("student")
    if err: return err
    user = current_user()
    conn = get_db()
    grades = conn.execute(
        "SELECT subject, marks_obtained, total_marks FROM grades WHERE student_id=?",
        (user["id"],)
    ).fetchall()
    conn.close()

    results = []
    for g in grades:
        obtained = g["marks_obtained"]
        total = g["total_marks"]
        passing_marks = total * 0.40  # 40% to pass
        internal_weightage = obtained * 0.40  # 40% weightage for internal
        external_needed = (passing_marks - internal_weightage) / 0.60
        external_needed = max(0, round(external_needed, 1))
        percentage = round((obtained / total) * 100, 1)
        status = "safe" if percentage >= 75 else "warning" if percentage >= 50 else "danger"
        results.append({
            "subject": g["subject"],
            "internal_marks": obtained,
            "total_marks": total,
            "percentage": percentage,
            "external_needed": external_needed,
            "max_external": 60,
            "status": status,
            "can_pass": external_needed <= 60
        })

    return jsonify({"results": results})
@app.get("/student/attendance-predictor")
def attendance_predictor():
    err = require_auth("student")
    if err: return err
    user = current_user()
    conn = get_db()

    # Get total classes per subject
    subjects = conn.execute(
        "SELECT subject, COUNT(*) as total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present FROM attendance WHERE roll_number=? GROUP BY subject",
        (user["roll_number"],)
    ).fetchall()

    results = []
    for s in subjects:
        total = s["total"]
        present = s["present"]
        percentage = round((present / total) * 100, 1) if total > 0 else 0

        # Classes needed to reach 75%
        if percentage >= 75:
            # How many can skip
            can_skip = 0
            t = total
            while True:
                if ((present) / (t + 1)) * 100 < 75:
                    break
                t += 1
                can_skip += 1
            status = "safe"
            message = f"✅ You can skip {can_skip} more classes"
        else:
            # Classes needed to reach 75%
            needed = 0
            t = total
            p = present
            while (p / t) * 100 < 75:
                t += 1
                p += 1
                needed += 1
            status = "warning" if percentage >= 60 else "danger"
            message = f"⚠️ Attend {needed} more classes to reach 75%"

        results.append({
            "subject": s["subject"],
            "present": present,
            "total": total,
            "percentage": percentage,
            "status": status,
            "message": message
        })

    # Overall attendance
    total_all = conn.execute(
        "SELECT COUNT(*) as t FROM attendance WHERE roll_number=?",
        (user["roll_number"],)
    ).fetchone()["t"]
    present_all = conn.execute(
        "SELECT COUNT(*) as p FROM attendance WHERE roll_number=? AND status='present'",
        (user["roll_number"],)
    ).fetchone()["p"]
    overall_pct = round((present_all / total_all) * 100, 1) if total_all > 0 else 0

    conn.close()
    return jsonify({
        "results": results,
        "overall": {
            "present": present_all,
            "total": total_all,
            "percentage": overall_pct,
            "eligible": overall_pct >= 75
        }
    })
@app.post("/chat")
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "message is required"}), 400
    if not CHATBOT_AVAILABLE:
        return jsonify({"response": "Chatbot not available.", "intent": "unknown", "confidence": 0})
    intent, confidence = predict_intent(message)
    confidence = float(confidence)
    if confidence < 0.35:
        reply = "Please ask about admissions, fees, exams, attendance, placements, hostel, library or scholarships."
    else:
        reply = get_response(intent)
    return jsonify({"response": reply, "intent": intent, "confidence": confidence})

# ════════════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    init_db()
    print("\n🚀 Smart College Assistant API")
    print("   Running on http://localhost:5000")
    print("\n📋 Demo Credentials:")
    print("   Faculty  — Roll: FAC001  Password: faculty123")
    print("   Student  — Roll: STU001  Password: student123")
    print("   Student  — Roll: STU002  Password: student123\n")
    import os
port = int(os.environ.get("PORT", 5000))
app.run(host="0.0.0.0", port=port, debug=False)

