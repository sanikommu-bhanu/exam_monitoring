import sqlite3, bcrypt, json, uuid
from datetime import datetime, timedelta

conn = sqlite3.connect('proctorai.db')
cursor = conn.cursor()

# Reset test student password
hashed = bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode()
cursor.execute('UPDATE users SET hashed_password=? WHERE email=?', (hashed, 'test@university.edu'))
print('Student password set to: password123')

# Reset admin password
hashed_admin = bcrypt.hashpw(b'Admin@123', bcrypt.gensalt()).decode()
cursor.execute('UPDATE users SET hashed_password=? WHERE email=?', (hashed_admin, 'admin@university.edu'))
print('Admin password set to: Admin@123')

# Create live test exam
start = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
end = (datetime.utcnow() + timedelta(hours=3)).isoformat()
now = datetime.utcnow().isoformat()
exam_id = str(uuid.uuid4())

cursor.execute('SELECT id FROM exams WHERE exam_code=?', ('CS101-LIVE',))
existing = cursor.fetchone()
if not existing:
    cursor.execute(
        'INSERT INTO exams (id,exam_code,title,subject,description,start_time,end_time,duration_minutes,'
        'allowed_students,created_by,enable_face_detection,enable_eye_tracking,enable_head_pose,'
        'enable_phone_detection,enable_multiple_person_detection,auto_terminate_on_high_risk,max_warnings,'
        'status,total_enrolled,total_appeared,created_at,updated_at) '
        'VALUES (?,?,?,?,?,?,?,?,?,?,1,1,1,1,1,0,3,?,1,0,?,?)',
        (exam_id, 'CS101-LIVE', 'Data Structures - Live Test', 'Computer Science',
         'Live proctoring demo exam', start, end, 180,
         json.dumps(['STU999']),
         'baac8d59-b796-400c-a26c-c0d4cc040488',
         'active', now, now)
    )
    print('Created exam: CS101-LIVE')
else:
    cursor.execute(
        'UPDATE exams SET status=?, start_time=?, end_time=? WHERE exam_code=?',
        ('active', start, end, 'CS101-LIVE')
    )
    print('Updated exam CS101-LIVE to active')

conn.commit()

cursor.execute('SELECT email, role FROM users')
print('Users:', cursor.fetchall())
cursor.execute('SELECT exam_code, status, allowed_students FROM exams')
print('Exams:', cursor.fetchall())
conn.close()
print('All done!')
