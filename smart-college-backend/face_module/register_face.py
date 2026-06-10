"""
register_face.py — Register a new student/faculty face into the database.
Run: python register_face.py
"""

import cv2
import face_recognition
import numpy as np
import pickle
from database import get_connection, init_db


def capture_face_encoding(name: str, roll_number: str) -> np.ndarray | None:
    """Open webcam, detect face, return its encoding."""
    print(f"\n📷 Starting camera for: {name} ({roll_number})")
    print("Look directly at the camera. Press SPACE to capture, Q to quit.\n")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open webcam.")
        return None

    encoding = None

    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Failed to read from webcam.")
            break

        # Detect faces in real-time for preview
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_small)

        display = frame.copy()

        # Draw boxes around detected faces
        for (top, right, bottom, left) in face_locations:
            top *= 4; right *= 4; bottom *= 4; left *= 4
            cv2.rectangle(display, (left, top), (right, bottom), (0, 255, 0), 2)

        status = f"Faces detected: {len(face_locations)}"
        color = (0, 255, 0) if face_locations else (0, 0, 255)
        cv2.putText(display, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        cv2.putText(display, "SPACE=Capture  Q=Quit", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        cv2.putText(display, f"Name: {name}", (10, display.shape[0] - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 1)

        cv2.imshow("Face Registration", display)

        key = cv2.waitKey(1) & 0xFF

        if key == ord('q'):
            print("Registration cancelled.")
            break

        elif key == ord(' '):
            if not face_locations:
                print("⚠️  No face detected. Please position your face in the frame.")
                continue

            if len(face_locations) > 1:
                print("⚠️  Multiple faces detected. Please ensure only one face is visible.")
                continue

            # Get encoding
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            encodings = face_recognition.face_encodings(rgb_frame, face_locations)

            if encodings:
                encoding = encodings[0]
                print("✅ Face captured successfully!")
                cv2.putText(display, "✅ CAPTURED!", (display.shape[1]//2 - 80, display.shape[0]//2),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
                cv2.imshow("Face Registration", display)
                cv2.waitKey(1500)
                break

    cap.release()
    cv2.destroyAllWindows()
    return encoding


def register_user(name: str, roll_number: str, role: str = "student"):
    """Register a new user with face encoding into the database."""
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    # Check if roll number already exists
    cursor.execute("SELECT id FROM users WHERE roll_number = ?", (roll_number,))
    if cursor.fetchone():
        print(f"⚠️  Roll number '{roll_number}' is already registered.")
        conn.close()
        return False

    conn.close()

    # Capture face
    encoding = capture_face_encoding(name, roll_number)
    if encoding is None:
        print("❌ Registration failed — no face encoding captured.")
        return False

    # Save to database
    conn = get_connection()
    cursor = conn.cursor()
    try:
        encoding_blob = pickle.dumps(encoding)
        cursor.execute(
            "INSERT INTO users (name, roll_number, role, face_encoding) VALUES (?, ?, ?, ?)",
            (name, roll_number, role, encoding_blob)
        )
        conn.commit()
        print(f"\n✅ Successfully registered: {name} ({roll_number}) as {role}")
        return True
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False
    finally:
        conn.close()


def list_registered_users():
    """Print all registered users."""
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, roll_number, role, created_at FROM users ORDER BY created_at DESC")
    users = cursor.fetchall()
    conn.close()

    if not users:
        print("No users registered yet.")
        return

    print(f"\n{'Name':<20} {'Roll Number':<15} {'Role':<10} {'Registered At'}")
    print("-" * 65)
    for u in users:
        print(f"{u['name']:<20} {u['roll_number']:<15} {u['role']:<10} {u['created_at']}")


if __name__ == "__main__":
    print("=" * 50)
    print("   Smart College Assistant — Face Registration")
    print("=" * 50)

    print("\n1. Register new user")
    print("2. List registered users")
    choice = input("\nEnter choice (1/2): ").strip()

    if choice == "1":
        name = input("Enter full name: ").strip()
        roll = input("Enter roll number: ").strip()
        role = input("Enter role (student/faculty) [default: student]: ").strip() or "student"

        if not name or not roll:
            print("❌ Name and roll number are required.")
        else:
            register_user(name, roll, role)

    elif choice == "2":
        list_registered_users()
    else:
        print("Invalid choice.")
