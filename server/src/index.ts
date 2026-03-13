import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db, initDb } from './db';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from client/dist
const distPath = path.resolve(__dirname, '../../client/dist');
if (require('fs').existsSync(distPath)) {
    app.use(express.static(distPath));
}

// Serve static files from server/public (for student photos)
const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const activeStudents: Map<string, any> = new Map();

// Helper om vragen naar de vraagbank te synchroniseren
const syncQuestionsToBank = (teacherId: string, questions: any[], labels: string[]) => {
  questions.forEach(q => {
    const { id, type, text, points, ...rest } = q;
    const labelsJson = JSON.stringify(labels || []);
    const dataJson = JSON.stringify(rest);
    db.run(
      `INSERT OR REPLACE INTO questions_bank (id, teacher_id, type, text, points, data, labels) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, teacherId, type, text, points, dataJson, labelsJson],
      (err) => { if (err) console.error('Bank Sync Error:', err); }
    );
  });
};

// --- API ---
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user: any) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    if (!user) return res.status(401).json({ error: 'Ongeldige login' });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  });
});

// Student API
app.get('/api/students', (req, res) => {
  db.all('SELECT * FROM students ORDER BY klas, name', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json(rows);
  });
});

app.post('/api/exams', (req, res) => {
  const { teacherId, title, questions, labels, type, isGraded } = req.body;
  const examKey = Math.random().toString(36).substring(7).toUpperCase();
  const examId = uuidv4();
  db.run(
    'INSERT INTO exams (id, teacher_id, title, exam_key, questions, labels, type, is_graded) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [examId, teacherId, title, examKey, JSON.stringify(questions), JSON.stringify(labels || []), type || 'examen', isGraded ? 1 : 0],
    (err) => {
      if (err) return res.status(500).json({ error: 'DB Error' });
      res.json({ title, examKey, id: examId });
    }
  );
});

app.put('/api/exams/:id', (req, res) => {
  const { teacherId, title, questions, labels, type, isGraded } = req.body;
  db.run(
    'UPDATE exams SET title = ?, questions = ?, labels = ?, type = ?, is_graded = ? WHERE id = ?',
    [title, JSON.stringify(questions), JSON.stringify(labels || []), type || 'examen', isGraded ? 1 : 0, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: 'DB Error' });
      db.get('SELECT exam_key FROM exams WHERE id = ?', [req.params.id], (err, row: any) => {
        res.json({ success: true, examKey: row?.exam_key });
      });
    }
  );
});

app.delete('/api/exams/:id', (req, res) => {
  db.run('DELETE FROM exams WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ success: true });
  });
});

app.get('/api/teacher/exams', (req, res) => {
  const { teacherId } = req.query;
  const sql = `
    SELECT e.*, 
    (SELECT COUNT(*) FROM submissions s WHERE s.exam_id = e.id) as submission_count
    FROM exams e 
    WHERE e.teacher_id = ? 
    ORDER BY created_at DESC
  `;
  db.all(sql, [teacherId], (err, rows: any[]) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    const result = (rows || []).map(r => ({ 
      ...r, 
      questions: JSON.parse(r.questions),
      labels: r.labels ? JSON.parse(r.labels) : [],
      isGraded: !!r.is_graded,
      hasSubmissions: r.submission_count > 0
    }));
    res.json(result);
  });
});

app.get('/api/questions-bank', (req, res) => {
  const { teacherId } = req.query;
  db.all('SELECT * FROM questions_bank WHERE teacher_id = ? ORDER BY created_at DESC', [teacherId], (err, rows: any[]) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    const result = (rows || []).map(r => {
      const data = JSON.parse(r.data);
      return { id: r.id, type: r.type, text: r.text, points: r.points, labels: r.labels ? JSON.parse(r.labels) : [], ...data };
    });
    res.json(result);
  });
});

app.post('/api/questions-bank', (req, res) => {
  const { teacherId, question, labels, forceNew } = req.body;
  const { id, type, text, points, ...rest } = question;
  const questionIdToStore = forceNew ? uuidv4() : id;
  db.run(
    `INSERT OR REPLACE INTO questions_bank (id, teacher_id, type, text, points, data, labels) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [questionIdToStore, teacherId, type, text, points, JSON.stringify(rest), JSON.stringify(labels || [])],
    (err) => {
      if (err) return res.status(500).json({ error: 'DB Error' });
      res.json({ success: true, id: questionIdToStore });
    }
  );
});

app.get('/api/questions-bank/check/:id', (req, res) => {
  db.get('SELECT id FROM questions_bank WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ exists: !!row });
  });
});

app.delete('/api/questions-bank/:id', (req, res) => {
  db.run('DELETE FROM questions_bank WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ success: true });
  });
});

app.get('/api/exams/:key', (req, res) => {
  db.get('SELECT * FROM exams WHERE exam_key = ?', [req.params.key], (err, row: any) => {
    if (err || !row) return res.status(404).json({ error: 'Niet gevonden' });
    row.questions = JSON.parse(row.questions);
    row.labels = row.labels ? JSON.parse(row.labels) : [];
    row.isGraded = !!row.is_graded;
    res.json(row);
  });
});

app.get('/api/exams/:id/submissions', (req, res) => {
  db.all('SELECT * FROM submissions WHERE exam_id = ? ORDER BY submitted_at DESC', [req.params.id], (err, rows: any[]) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    rows.forEach(r => {
      r.answers = JSON.parse(r.answers);
      r.scores = r.scores ? JSON.parse(r.scores) : null;
    });
    res.json(rows);
  });
});

app.put('/api/submissions/:id/scores', (req, res) => {
  const { scores } = req.body;
  db.run('UPDATE submissions SET scores = ? WHERE id = ?', [JSON.stringify(scores), req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ success: true });
  });
});

app.post('/api/submissions', (req, res) => {
  const { examId, name, klas, answers } = req.body;
  db.run(
    'INSERT INTO submissions (id, exam_id, student_name, student_klas, answers) VALUES (?, ?, ?, ?, ?)',
    [uuidv4(), examId, name, klas, JSON.stringify(answers || {})],
    (err) => {
      if (err) return res.status(500).json({ error: 'DB Error' });
      db.get('SELECT exam_key FROM exams WHERE id = ?', [examId], (err, row: any) => {
        if (!err && row) io.to(`teacher_${row.exam_key}`).emit('student_finished', { name });
      });
      res.json({ success: true });
    }
  );
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const index = path.join(distPath, 'index.html');
  if (require('fs').existsSync(index)) res.sendFile(index);
  else res.status(404).send('Not found');
});

// --- Socket ---
io.on('connection', (socket) => {
  socket.on('teacher_join', (examKey) => {
    socket.join(`teacher_${examKey}`);
    const studentsInExam = Array.from(activeStudents.values()).filter(s => s.examKey === examKey);
    socket.emit('current_students', studentsInExam);
  });

  socket.on('session_close', (examKey) => {
    for (const [id, s] of activeStudents.entries()) if (s.examKey === examKey) activeStudents.delete(id);
    io.to(`exam_${examKey}`).emit('session_closed');
  });

  socket.on('student_join', ({ examKey, name, klas, photo_url }) => {
    for (const [id, s] of activeStudents.entries()) if (s.name === name && s.examKey === examKey) activeStudents.delete(id);
    const studentData = { socketId: socket.id, name, klas, photo_url, examKey, status: 'active' };
    activeStudents.set(socket.id, studentData);
    socket.join(`exam_${examKey}`);
    io.to(`teacher_${examKey}`).emit('student_joined', studentData);
  });

  socket.on('cheat_alert', ({ reason }) => {
    const s = activeStudents.get(socket.id);
    if (s) {
      s.status = 'cheated';
      io.to(`teacher_${s.examKey}`).emit('student_cheated', { socketId: socket.id, name: s.name, reason });
    }
  });

  socket.on('disconnect', () => {
    const s = activeStudents.get(socket.id);
    if (s) {
      io.to(`teacher_${s.examKey}`).emit('student_disconnected', { socketId: socket.id });
      activeStudents.delete(socket.id);
    }
  });
});

initDb().then(() => {
    server.listen(3001, '0.0.0.0', () => {
        console.log('\n🚀 SERVER READY\n🔗 http://localhost:3001\n');
    });
}).catch(err => console.error('DB INIT FAILED', err));
