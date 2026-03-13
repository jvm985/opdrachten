import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { randomUUID } from 'crypto';
import { db, initDb } from './db';
import { OAuth2Client } from 'google-auth-library';

export const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const client = new OAuth2Client('339058057860-i6ne31mqs27mqm2ulac7al9vi26pmgo1.apps.googleusercontent.com');

const distPath = path.resolve(__dirname, '../../client/dist');
if (require('fs').existsSync(distPath)) {
    app.use(express.static(distPath));
}

const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const activeStudents: Map<string, any> = new Map();

const generateEmail = (name: string) => {
  return name.toLowerCase().replace(/\s+/g, '.') + '@atheneumkapellen.be';
};

// --- API ---

app.post('/api/auth/google', async (req, res) => {
  const { token, role, isAccessToken } = req.body;
  try {
    let email: string | undefined;
    
    if (isAccessToken) {
      const infoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
      const info: any = await infoRes.json();
      email = info.email;
    } else {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: '339058057860-i6ne31mqs27mqm2ulac7al9vi26pmgo1.apps.googleusercontent.com',
      });
      email = ticket.getPayload()?.email;
    }

    if (!email) return res.status(401).json({ error: 'Fout bij verificatie' });

    console.log(`🔑 Login poging voor: ${email} (Rol: ${role})`);

    if (!email.endsWith('@atheneumkapellen.be')) {
      return res.status(403).json({ error: 'Alleen school-accounts toegestaan.' });
    }

    if (role === 'teacher') {
      db.get('SELECT * FROM users WHERE email = ? AND role = "teacher"', [email], (err, user: any) => {
        if (err || !user) return res.status(404).json({ error: 'Geen docent-account gevonden.' });
        res.json({ id: user.id, email: user.email, name: user.name, role: 'teacher' });
      });
    } else {
      db.get('SELECT * FROM students WHERE email = ?', [email], (err, student: any) => {
        if (student) {
          res.json({ id: student.id, name: student.name, klas: student.klas, photo_url: student.photo_url, role: 'student' });
        } else {
          db.all('SELECT * FROM students', [], (err, allStudents: any[]) => {
            const matched = allStudents.find(s => generateEmail(s.name) === email);
            if (matched) {
              db.run('UPDATE students SET email = ? WHERE id = ?', [email, matched.id]);
              res.json({ id: matched.id, name: matched.name, klas: matched.klas, photo_url: matched.photo_url, role: 'student' });
            } else {
              res.status(404).json({ error: 'Je staat niet in de leerlingenlijst.' });
            }
          });
        }
      });
    }
  } catch (error) {
    res.status(401).json({ error: 'Google verificatie mislukt' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user: any) => {
    if (user) res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    else res.status(401).json({ error: 'Ongeldige login' });
  });
});

app.get('/api/students', (req, res) => {
  db.all('SELECT * FROM students ORDER BY klas, name', (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/api/exams', (req, res) => {
  const { teacherId, title, questions, labels, type, isGraded, requireFullscreen, detectTabSwitch } = req.body;
  const examKey = Math.random().toString(36).substring(7).toUpperCase();
  const examId = randomUUID();
  db.run(
    'INSERT INTO exams (id, teacher_id, title, exam_key, questions, labels, type, is_graded, require_fullscreen, detect_tab_switch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [examId, teacherId, title, examKey, JSON.stringify(questions), JSON.stringify(labels || []), type || 'examen', isGraded ? 1 : 0, requireFullscreen ? 1 : 0, detectTabSwitch ? 1 : 0],
    (err) => {
      if (err) return res.status(500).json({ error: 'DB Error' });
      res.json({ title, examKey, id: examId });
    }
  );
});
app.put('/api/exams/:id', (req, res) => {
  const { title, questions, labels, type, isGraded, requireFullscreen, detectTabSwitch } = req.body;
  db.run(
    'UPDATE exams SET title = ?, questions = ?, labels = ?, type = ?, is_graded = ?, require_fullscreen = ?, detect_tab_switch = ? WHERE id = ?',
    [title, JSON.stringify(questions), JSON.stringify(labels || []), type || 'examen', isGraded ? 1 : 0, requireFullscreen ? 1 : 0, detectTabSwitch ? 1 : 0, req.params.id],
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
    res.json({ success: true });
  });
});

app.get('/api/teacher/exams', (req, res) => {
  const { teacherId } = req.query;
  const sql = `
    SELECT e.*, (SELECT COUNT(*) FROM submissions s WHERE s.exam_id = e.id) as submission_count
    FROM exams e WHERE e.teacher_id = ? ORDER BY created_at DESC
  `;
  db.all(sql, [teacherId], (err, rows: any[]) => {
    const result = (rows || []).map(r => ({ 
      ...r, questions: JSON.parse(r.questions),
      labels: r.labels ? JSON.parse(r.labels) : [],
      isGraded: !!r.is_graded,
      requireFullscreen: !!r.require_fullscreen,
      detectTabSwitch: !!r.detect_tab_switch,
      submissionCount: r.submission_count,
      hasSubmissions: r.submission_count > 0
    }));
    res.json(result);
  });
});

app.get('/api/questions-bank', (req, res) => {
  const { teacherId } = req.query;
  db.all('SELECT * FROM questions_bank WHERE teacher_id = ? ORDER BY created_at DESC', [teacherId], (err, rows: any[]) => {
    const result = (rows || []).map(r => ({ id: r.id, type: r.type, text: r.text, points: r.points, labels: r.labels ? JSON.parse(r.labels) : [], ...JSON.parse(r.data) }));
    res.json(result);
  });
});

app.post('/api/questions-bank', (req, res) => {
  const { teacherId, question, labels, forceNew } = req.body;
  const { id, type, text, points, ...rest } = question;
  const questionIdToStore = forceNew ? randomUUID() : id;
  db.run(
    `INSERT OR REPLACE INTO questions_bank (id, teacher_id, type, text, points, data, labels) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [questionIdToStore, teacherId, type, text, points, JSON.stringify(rest), JSON.stringify(labels || [])],
    (err) => {
      res.json({ success: true, id: questionIdToStore });
    }
  );
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
    row.requireFullscreen = !!row.require_fullscreen;
    row.detectTabSwitch = !!row.detect_tab_switch;
    res.json(row);
  });
});

app.get('/api/exams/details/:id', (req, res) => {
  db.get('SELECT * FROM exams WHERE id = ?', [req.params.id], (err, row: any) => {
    if (err || !row) return res.status(404).json({ error: 'Niet gevonden' });
    row.questions = JSON.parse(row.questions);
    row.labels = row.labels ? JSON.parse(row.labels) : [];
    row.isGraded = !!row.is_graded;
    row.requireFullscreen = !!row.require_fullscreen;
    row.detectTabSwitch = !!row.detect_tab_switch;
    res.json(row);
  });
});

app.get('/api/exams/:id/submissions', (req, res) => {
  db.all('SELECT * FROM submissions WHERE exam_id = ? ORDER BY submitted_at DESC', [req.params.id], (err, rows: any[]) => {
    (rows || []).forEach(r => {
      r.answers = JSON.parse(r.answers);
      r.scores = r.scores ? JSON.parse(r.scores) : null;
    });
    res.json(rows || []);
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
    [randomUUID(), examId, name, klas, JSON.stringify(answers || {})],
    (err) => {
      db.get('SELECT exam_key FROM exams WHERE id = ?', [examId], (err, row: any) => {
        if (!err && row) io.to(`teacher_${row.exam_key}`).emit('student_finished', { name });
      });
      res.json({ success: true });
    }
  );
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
  if (process.env.NODE_ENV !== 'test') {
    server.listen(3001, '0.0.0.0', () => {
        console.log('\n🚀 SERVER READY\n🔗 http://localhost:3001\n');
    });
  }
});
