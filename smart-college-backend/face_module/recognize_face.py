"""
recognize_face.py — Recognize a face, verify identity, and mark attendance.
Run: python recognize_face.py
"""

import cv2
import face_recognitionQ
import numpy as np
import pickle
from datetime import datetime
from database import get_connection, init_db


TOLERANCE = 0.50  # Lower = stricter matching (0.4–0.6 is recommended)
REQUIRED_FRAMES = 5  # Number of consecutive matches needed to confirm identity


def load_known_faces() -> tuple[list, list, list, list]:
    """Load all face encodings from the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, roll_number, role, face_encoding FROM users")
    rows = cursor.fetchall()
    conn.close()

    ids, names, rolls, roles, encodings = [], [], [], [], []
    for row in rows:
        ids.append(row["id"])
        names.append(row["name"])
        rolls.append(row["roll_number"])
        roles.append(row["role"])
        encodings.append(pickle.loads(row["face_encoding"]))

    return ids, names, rolls, roles, encodings


def mark_attendance(user_id: int, name: str, roll_number: str) -> dict:
    """Mark attendance for a user. Returns status dict."""
    today = datetime.now().strftime("%Y-%m-%d")
    time_now = datetime.now().strftime("%H:%M:%S")

    conn = get_connection()
    cursor = conn.cursor()

    # Check if already marked today
    cursor.execute(
        "SELECT id, time FROM attendance WHERE roll_number = ? AND date = ?",
        (roll_number, today)
    )
    existing = cursor.fetchone()

    if existing:
        conn.close()
        return {
            "status": "already_marked",
            "message": f"Attendance already marked today at {existing['time']}",
            "name": name,
            "roll_number": roll_number,
            "date": today,
        }

    # Mark attendance
    cursor.execute(
        "INSERT INTO attendance (user_id, name, roll_number, date, time, status) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, name, roll_number, today, time_now, "present")
    )
    conn.commit()
    conn.close()

    return {
        "status": "marked",
        "message": f"Attendance marked successfully at {time_now}",
        "name": name,
        "roll_number": roll_number,
        "date": today,
        "time": time_now,
    }


def recognize_and_attend():
    """Main function: open webcam, recognize face, mark attendance."""
    init_db()

    print("\n📋 Loading registered faces from database...")
    user_ids, names, rolls, roles, known_encodings = load_known_faces()

    if not known_encodings:
        print("❌ No registered faces found. Please register users first using register_face.py")
        return

    print(f"✅ Loaded {len(known_encodings)} registered face(s).")
    print("\n📷 Starting camera... Look at the camera to mark your attendance.")
    print("Press Q to quit.\n")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open webcam.")
        return

    # Track consecutive matches per roll number
    match_counter = {}
    attendance_results = {}
    processed_rolls = set()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Process every other frame for performance
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_small)
        face_encodings = face_recognition.face_encodings(rgb_small, face_locations)

        display = frame.copy()

        for face_encoding, face_location in zip(face_encodings, face_locations):
            top, right, bottom, left = [v * 4 for v in face_location]

            # Compare with known faces
            distances = face_recognition.face_distance(known_encodings, face_encoding)
            best_idx = np.argmin(distances)
            best_distance = distances[best_idx]

            if best_distance < TOLERANCE:
                roll = rolls[best_idx]
                name = names[best_idx]
                role = roles[best_idx]
                user_id = user_ids[best_idx]
                label = f"{name} ({roll})"
                box_color = (0, 255, 0)
                confidence = int((1 - best_distance) * 100)

                if roll not in processed_rolls:
                    match_counter[roll] = match_counter.get(roll, 0) + 1

                    if match_counter[roll] >= REQUIRED_FRAMES:
                        result = mark_attendance(user_id, name, roll)
                        attendance_results[roll] = result
                        processed_rolls.add(roll)

                        if result["status"] == "marked":
                            print(f"✅ {name} ({roll}) — Attendance marked at {result['time']}")
                        else:
                            print(f"ℹ️  {name} ({roll}) — {result['message']}")

                # Show status on frame
                if roll in attendance_results:
                    status = attendance_results[roll]["status"]
                    status_text = "✅ Marked" if status == "marked" else "⚠️ Already Marked"
                    box_color = (0, 255, 0) if status == "marked" else (0, 165, 255)
                else:
                    status_text = f"Verifying... {match_counter.get(roll, 0)}/{REQUIRED_FRAMES}"
                    box_color = (255, 165, 0)

                cv2.putText(display, status_text, (left, top - 35),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, box_color, 2)
                cv2.putText(display, f"{confidence}% match", (left, top - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, box_color, 1)
            else:
                label = "Unknown"
                box_color = (0, 0, 255)
                cv2.putText(display, "Not Registered", (left, top - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, box_color, 2)

            # Draw face box and name
            cv2.rectangle(display, (left, top), (right, bottom), box_color, 2)
            cv2.rectangle(display, (left, bottom), (right, bottom + 25), box_color, cv2.FILLED)
            cv2.putText(display, label, (left + 4, bottom + 18),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Status bar
        date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(display, f"Smart College Assistant  |  {date_str}", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)
        cv2.putText(display, "Press Q to quit", (10, display.shape[0] - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

        cv2.imshow("Smart College Assistant — Attendance", display)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

    # Summary
    if attendance_results:
        print("\n" + "=" * 50)
        print("         ATTENDANCE SUMMARY")
        print("=" * 50)
        for roll, result in attendance_results.items():
            icon = "✅" if result["status"] == "marked" else "ℹ️ "
            print(f"{icon}  {result['name']} ({roll}) — {result['message']}")
    else:
        print("\nNo attendance was marked in this session.")


if __name__ == "__main__":
    recognize_and_attend()
