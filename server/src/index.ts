import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { db, initDb } from './db';
import { OAuth2Client } from 'google-auth-library';
import multer from 'multer';
import * as XLSX from 'xlsx';

const upload = multer({ dest: 'uploads/' });

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
    if (!email.endsWith('@atheneumkapellen.be')) return res.status(403).json({ error: 'Alleen school-accounts toegestaan.' });

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
  const { teacherId, title, questions, labels, type, isGraded, requireFullscreen, detectTabSwitch, isShared } = req.body;
  const examKey = Math.random().toString(36).substring(7).toUpperCase();
  const examId = randomUUID();
  db.run(
    'INSERT INTO exams (id, teacher_id, title, exam_key, questions, labels, type, is_graded, require_fullscreen, detect_tab_switch, is_shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [examId, teacherId, title, examKey, JSON.stringify(questions), JSON.stringify(labels || []), type || 'examen', isGraded ? 1 : 0, requireFullscreen ? 1 : 0, detectTabSwitch ? 1 : 0, isShared ? 1 : 0],
    (err) => {
      if (err) return res.status(500).json({ error: 'DB Error' });
      res.json({ title, examKey, id: examId });
    }
  );
});

app.put('/api/exams/:id', (req, res) => {
  const { title, questions, labels, type, isGraded, requireFullscreen, detectTabSwitch, isShared } = req.body;
  db.run(
    'UPDATE exams SET title = ?, questions = ?, labels = ?, type = ?, is_graded = ?, require_fullscreen = ?, detect_tab_switch = ?, is_shared = ? WHERE id = ?',
    [title, JSON.stringify(questions), JSON.stringify(labels || []), type || 'examen', isGraded ? 1 : 0, requireFullscreen ? 1 : 0, detectTabSwitch ? 1 : 0, isShared ? 1 : 0, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: 'DB Error' });
      db.get('SELECT exam_key FROM exams WHERE id = ?', [req.params.id], (err, row: any) => {
        res.json({ success: true, examKey: row?.exam_key });
      });
    }
  );
});

app.get('/api/teacher/exams', (req, res) => {
  const { teacherId } = req.query;
  db.all(`
    SELECT e.*, 
    (SELECT COUNT(*) FROM submissions WHERE exam_id = e.id) as submission_count
    FROM exams e 
    WHERE e.teacher_id = ? AND e.is_deleted = 0
    ORDER BY e.created_at DESC`, [teacherId], (err, rows: any[]) => {
    const result = (rows || []).map(r => ({ 
      ...r, questions: JSON.parse(r.questions),
      labels: r.labels ? JSON.parse(r.labels) : [],
      isGraded: !!r.is_graded,
      requireFullscreen: !!r.require_fullscreen,
      detectTabSwitch: !!r.detect_tab_switch,
      isShared: !!r.is_shared,
      isDeleted: !!r.is_deleted,
      submissionCount: r.submission_count,
      hasSubmissions: r.submission_count > 0
    }));
    res.json(result);
  });
});

app.get('/api/teacher/trashed-exams', (req, res) => {
  const { teacherId } = req.query;
  db.all(`
    SELECT e.*, 
    (SELECT COUNT(*) FROM submissions WHERE exam_id = e.id) as submission_count
    FROM exams e 
    WHERE e.teacher_id = ? AND e.is_deleted = 1
    ORDER BY e.created_at DESC`, [teacherId], (err, rows: any[]) => {
    const result = (rows || []).map(r => ({ 
      ...r, questions: JSON.parse(r.questions),
      labels: r.labels ? JSON.parse(r.labels) : [],
      isGraded: !!r.is_graded,
      requireFullscreen: !!r.require_fullscreen,
      detectTabSwitch: !!r.detect_tab_switch,
      isShared: !!r.is_shared,
      isDeleted: !!r.is_deleted,
      submissionCount: r.submission_count,
      hasSubmissions: r.submission_count > 0
    }));
    res.json(result);
  });
});

app.get('/api/teacher/shared-exams', (req, res) => {
  const { teacherId } = req.query;
  db.all(`
    SELECT e.*, u.name as teacher_name
    FROM exams e
    JOIN users u ON e.teacher_id = u.id
    WHERE e.is_shared = 1 AND e.teacher_id != ? AND e.is_deleted = 0
    ORDER BY e.created_at DESC`, [teacherId], (err, rows: any[]) => {
    const result = (rows || []).map(r => ({ 
      ...r, questions: JSON.parse(r.questions),
      labels: r.labels ? JSON.parse(r.labels) : [],
      isGraded: !!r.is_graded,
      requireFullscreen: !!r.require_fullscreen,
      detectTabSwitch: !!r.detect_tab_switch,
      isShared: true,
      teacherName: r.teacher_name
    }));
    res.json(result);
  });
});

app.post('/api/exams/:id/restore', (req, res) => {
  db.run('UPDATE exams SET is_deleted = 0 WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ success: true });
  });
});

app.delete('/api/exams/:id/permanent', (req, res) => {
  db.run('DELETE FROM exams WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ success: true });
  });
});

app.delete('/api/exams/:id', (req, res) => {
  db.run('UPDATE exams SET is_deleted = 1 WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ success: true });
  });
});

app.get('/api/admin/teachers', (req, res) => {
  db.all('SELECT id, name, first_name, last_name, email FROM users WHERE role = "teacher" ORDER BY last_name, first_name', [], (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/api/admin/teachers', (req, res) => {
  const { first_name, last_name, email } = req.body;
  const fullName = `${first_name} ${last_name}`.trim();
  // Gebruik email als ID zoals gevraagd
  db.run('INSERT INTO users (id, email, first_name, last_name, name, role, password) VALUES (?, ?, ?, ?, ?, ?, ?)', 
    [email, email, first_name, last_name, fullName, 'teacher', 'GoogleAuthOnly'], function(err) {
    if (err) return res.status(500).json({ error: 'DB Error of e-mail bestaat al' });
    res.json({ id: email, email, first_name, last_name, name: fullName });
  });
});

app.put('/api/admin/teachers/:id', (req, res) => {
  const { first_name, last_name, email } = req.body;
  const fullName = `${first_name} ${last_name}`.trim();
  db.run('UPDATE users SET first_name = ?, last_name = ?, name = ?, email = ? WHERE id = ?', 
    [first_name, last_name, fullName, email, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ success: true });
  });
});

app.delete('/api/admin/teachers/:id', (req, res) => {
  // Beveiliging: verwijder jezelf niet
  db.run('DELETE FROM users WHERE id = ? AND role = "teacher"', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ success: true });
  });
});

app.get('/api/admin/students', (req, res) => {
  db.all('SELECT * FROM students ORDER BY klas, last_name, first_name', [], (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/api/admin/students', (req, res) => {
  const { first_name, last_name, klas, email, photo_url } = req.body;
  const fullName = `${first_name} ${last_name}`.trim();
  db.run('INSERT INTO students (name, first_name, last_name, klas, email, photo_url) VALUES (?, ?, ?, ?, ?, ?)', 
    [fullName, first_name, last_name, klas, email, photo_url], function(err) {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ id: this.lastID, name: fullName, first_name, last_name, klas, email, photo_url });
  });
});

app.put('/api/admin/students/:id', (req, res) => {
  const { first_name, last_name, klas, email, photo_url } = req.body;
  const fullName = `${first_name} ${last_name}`.trim();
  db.run('UPDATE students SET name = ?, first_name = ?, last_name = ?, klas = ?, email = ?, photo_url = ? WHERE id = ?', 
    [fullName, first_name, last_name, klas, email, photo_url, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ success: true });
  });
});

app.delete('/api/admin/students/clear', (req, res) => {
  db.run('DELETE FROM students; DELETE FROM sqlite_sequence WHERE name="students";', (err) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ success: true });
  });
});

app.delete('/api/admin/students/:id', (req, res) => {
  db.run('DELETE FROM students WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ success: true });
  });
});

app.post('/api/admin/import-students-xlsx', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Geen bestand geüpload' });
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);
    let importedCount = 0;
    for (const row of rawData) {
      const keys = Object.keys(row);
      const findVal = (target: string) => {
        const key = keys.find(k => k.trim().toLowerCase() === target.toLowerCase());
        return key ? row[key] : '';
      };
      const voornaam = (findVal('Voornaam') || '').toString().trim();
      const achternaam = (findVal('Naam') || '').toString().trim();
      const klas = (findVal('Klas- of groepsnaam') || '').toString().trim();
      if (voornaam || achternaam) {
        const fullName = `${voornaam} ${achternaam}`.trim();
        await new Promise((resolve) => {
          db.run('INSERT INTO students (name, first_name, last_name, klas) VALUES (?, ?, ?, ?)',
            [fullName, voornaam, achternaam, klas], () => resolve(true));
        });
        importedCount++;
      }
    }
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json({ success: true, count: importedCount });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Import mislukt' });
  }
});

app.post('/api/admin/import-photos-pdf', upload.single('pdf'), async (req, res) => {
  console.log('--- 📥 PDF UPLOAD VOOR FOTO KOPPELING ---');
  if (!req.file) return res.status(400).json({ error: 'Geen bestand geüpload' });

  const filePath = req.file.path;
  const photoSourceDir = path.resolve(__dirname, 'temp_photos_link');
  const photoDestDir = path.resolve(__dirname, '../public/photos');

  if (!fs.existsSync(photoSourceDir)) fs.mkdirSync(photoSourceDir, { recursive: true });
  if (!fs.existsSync(photoDestDir)) fs.mkdirSync(photoDestDir, { recursive: true });

  try {
    fs.readdirSync(photoSourceDir).forEach(f => fs.unlinkSync(path.join(photoSourceDir, f)));

    // 1. Extraheer XML + Images via pdftohtml
    // pdftohtml genereert alles in de temp map
    execSync(`pdftohtml -xml -nodrm "${filePath}" "${path.join(photoSourceDir, 'layout.xml')}"`);
    
    const xmlContent = fs.readFileSync(path.join(photoSourceDir, 'layout.xml'), 'utf8');
    const students: any[] = await new Promise((resolve) => {
      db.all('SELECT id, name FROM students', [], (err, rows) => resolve(rows || []));
    });

    const pageMatches = xmlContent.split('<page');
    let linkedCount = 0;

    for (let pIdx = 1; pIdx < pageMatches.length; pIdx++) {
      const page = pageMatches[pIdx];
      
      // Zoek alle namen op deze pagina
      const textRegex = /top="(\d+)" left="(\d+)"[^>]*>(.*?)<\/text>/g;
      const namesOnPage: { name: string, top: number, left: number }[] = [];
      let m;
      while ((m = textRegex.exec(page)) !== null) {
        const textValue = m[3].replace(/<[^>]*>/g, '').trim();
        if (textValue.length > 3 && !['Klaslijst', 'Afdrukdatum', 'SMARTSCHOOL'].some(s => textValue.includes(s))) {
          const pdfWords = textValue.toLowerCase().replace(/'/g, '').split(/\s+/).filter(w => w.length > 1);
          const matchInDb = students.find(s => {
            const dbName = (s.name || '').toLowerCase().replace(/'/g, '');
            return pdfWords.every(word => dbName.includes(word));
          });
          if (matchInDb) namesOnPage.push({ name: textValue, top: parseInt(m[1]), left: parseInt(m[2]) });
        }
      }

      // Zoek alle images op deze pagina
      const imgRegex = /<image top="(\d+)" left="(\d+)"[^>]*src="(.*?)"\/>/g;
      const imgsOnPage: { top: number, left: number, file: string }[] = [];
      while ((m = imgRegex.exec(page)) !== null) {
        // BELANGRIJK: Pak alleen de bestandsnaam uit het 'src' attribuut
        const fileName = path.basename(m[3]);
        imgsOnPage.push({ top: parseInt(m[1]), left: parseInt(m[2]), file: fileName });
      }

      console.log(`Pagina ${pIdx}: ${namesOnPage.length} namen, ${imgsOnPage.length} images.`);

      for (const nameObj of namesOnPage) {
        // MATCHING LOGICA: Zoek de image die het dichtst bij de naam staat
        const closestImg = imgsOnPage.find(img => {
          const xDiff = Math.abs(nameObj.left - img.left); 
          const yDiff = nameObj.top - img.top;
          // De foto staat linksboven de naam
          // X-marge is ruim (150px), Y-marge ook (250px)
          return xDiff < 150 && yDiff > 50 && yDiff < 250;
        });

        if (closestImg) {
          const sourcePath = path.join(photoSourceDir, closestImg.file);
          if (fs.existsSync(sourcePath)) {
            const jpgName = `linked_${Date.now()}_${nameObj.name.replace(/\s+/g, '_')}.jpg`;
            const destPath = path.join(photoDestDir, jpgName);
            
            fs.copyFileSync(sourcePath, destPath);

            const pdfWords = nameObj.name.toLowerCase().replace(/'/g, '').split(/\s+/).filter(w => w.length > 1);
            const match = students.find(s => {
              const dbName = (s.name || '').toLowerCase().replace(/'/g, '');
              return pdfWords.every(word => dbName.includes(word));
            });

            if (match) {
              await new Promise((resolve) => {
                db.run('UPDATE students SET photo_url = ? WHERE id = ?', [`/photos/${jpgName}`, match.id], () => resolve(true));
              });
              linkedCount++;
              console.log(`✅ MATCH: ${nameObj.name} (X:${nameObj.left},Y:${nameObj.top}) -> ${closestImg.file} (X:${closestImg.left},Y:${closestImg.top})`);
            }
          }
        } else {
          console.log(`❌ GEEN FOTO gevonden voor: ${nameObj.name} bij X:${nameObj.left}, Y:${nameObj.top}`);
        }
      }
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true, count: linkedCount });
  } catch (error) {
    console.error('❌ PDF Link Fout:', error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Koppelen mislukt' });
  }
});

app.post('/api/admin/import-students-pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Geen bestand geüpload' });
  const filePath = req.file.path;
  const photoSourceDir = path.resolve(__dirname, 'temp_photos_upload');
  const photoDestDir = path.resolve(__dirname, '../public/photos');
  if (!fs.existsSync(photoSourceDir)) fs.mkdirSync(photoSourceDir, { recursive: true });
  if (!fs.existsSync(photoDestDir)) fs.mkdirSync(photoDestDir, { recursive: true });
  try {
    fs.readdirSync(photoSourceDir).forEach(f => fs.unlinkSync(path.join(photoSourceDir, f)));
    execSync(`pdfimages -j "${filePath}" "${path.join(photoSourceDir, 'img')}"`);
    const textPath = path.join(photoSourceDir, 'list.txt');
    execSync(`pdftotext -layout "${filePath}" "${textPath}"`);
    const text = fs.readFileSync(textPath, 'utf8');
    const pages = text.split('\f');
    let ppmCounter = 0;
    let globalPhotoCounter = Date.now();
    let importedCount = 0;
    for (const page of pages) {
      const lines = page.split('\n');
      let currentKlas = '';
      const klasMatch = page.match(/Klaslijst \(([^)]+)\)/);
      if (klasMatch) currentKlas = klasMatch[1];
      if (!currentKlas) continue;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.includes('Klaslijst') || trimmed.includes('Afdrukdatum') || trimmed.includes('SMARTSCHOOL') || trimmed === '1') continue;
        const names = trimmed.split(/\s{2,}/).map(n => n.trim()).filter(n => n.length > 2);
        for (const name of names) {
          const ppmFile = path.join(photoSourceDir, `img-${String(ppmCounter * 2).padStart(3, '0')}.ppm`);
          const jpgName = `student_upload_${globalPhotoCounter}.jpg`;
          const destPath = path.join(photoDestDir, jpgName);
          let photoUrl = null;
          if (fs.existsSync(ppmFile)) {
            try {
              execSync(`magick convert "${ppmFile}" "${destPath}"`);
              photoUrl = `/photos/${jpgName}`;
            } catch (err) {}
          } else {
            const jpgFile = path.join(photoSourceDir, `img-${String(ppmCounter * 2).padStart(3, '0')}.jpg`);
            if (fs.existsSync(jpgFile)) {
               fs.copyFileSync(jpgFile, destPath);
               photoUrl = `/photos/${jpgName}`;
            }
          }
          db.run('INSERT INTO students (name, klas, photo_url) VALUES (?, ?, ?)', [name, currentKlas, photoUrl]);
          ppmCounter++;
          globalPhotoCounter++;
          importedCount++;
        }
      }
    }
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true, count: importedCount });
  } catch (error) { res.status(500).json({ error: 'Import mislukt' }); }
});

app.get('/api/admin/all-exams', (req, res) => {
  db.all(`
    SELECT e.*, u.name as teacher_name, u.email as teacher_email,
    (SELECT COUNT(*) FROM submissions WHERE exam_id = e.id) as submission_count
    FROM exams e 
    JOIN users u ON e.teacher_id = u.id
    WHERE e.is_deleted = 0
    ORDER BY e.created_at DESC`, [], (err, rows: any[]) => {
    const result = (rows || []).map(r => ({ 
      ...r, questions: JSON.parse(r.questions),
      labels: r.labels ? JSON.parse(r.labels) : [],
      isGraded: !!r.is_graded,
      requireFullscreen: !!r.require_fullscreen,
      detectTabSwitch: !!r.detect_tab_switch,
      isShared: !!r.is_shared,
      submissionCount: r.submission_count,
      teacherName: r.teacher_name,
      teacherEmail: r.teacher_email
    }));
    res.json(result);
  });
});

app.get('/api/questions-bank', (req, res) => {
  const { teacherId } = req.query;
  db.all('SELECT * FROM questions_bank WHERE teacher_id = ? ORDER BY created_at DESC', [teacherId], (err, rows: any[]) => {
    const result = (rows || []).map(r => ({ 
      id: r.id, type: r.type, text: r.text, points: r.points, 
      labels: r.labels ? JSON.parse(r.labels) : [], 
      isShared: !!r.is_shared,
      ...JSON.parse(r.data) 
    }));
    res.json(result);
  });
});

app.get('/api/questions-bank/shared', (req, res) => {
  const { teacherId } = req.query;
  db.all(`
    SELECT q.*, u.name as teacher_name 
    FROM questions_bank q 
    JOIN users u ON q.teacher_id = u.id
    WHERE q.is_shared = 1 AND q.teacher_id != ? 
    ORDER BY q.created_at DESC`, [teacherId], (err, rows: any[]) => {
    const result = (rows || []).map(r => ({ 
      id: r.id, type: r.type, text: r.text, points: r.points, 
      labels: r.labels ? JSON.parse(r.labels) : [], 
      isShared: true,
      teacherName: r.teacher_name,
      ...JSON.parse(r.data) 
    }));
    res.json(result);
  });
});

app.post('/api/questions-bank', (req, res) => {
  const { teacherId, question, labels, forceNew, isShared } = req.body;
  const { id, type, text, points, ...rest } = question;
  const questionIdToStore = forceNew ? randomUUID() : id;
  db.run(
    `INSERT OR REPLACE INTO questions_bank (id, teacher_id, type, text, points, data, labels, is_shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [questionIdToStore, teacherId, type, text, points, JSON.stringify(rest), JSON.stringify(labels || []), isShared ? 1 : 0],
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

app.delete('/api/submissions/:id', (req, res) => {
  db.run('DELETE FROM submissions WHERE id = ?', [req.params.id], (err) => {
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
      if (err) return res.status(500).json({ error: 'DB Error' });
      db.get('SELECT exam_key FROM exams WHERE id = ?', [examId], (err, row: any) => {
        if (!err && row) io.to(`teacher_${row.exam_key}`).emit('student_finished', { name });
      });
      io.emit('submission_received', { examId });
      res.json({ success: true });
    }
  );
});

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

console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

initDb()
  .then(() => console.log('✅ Database initialization finished.'))
  .catch(err => console.error('❌ Database initialization failed:', err));

if (process.env.NODE_ENV !== 'test') {
  server.listen(3001, '0.0.0.0', () => {
    console.log('\n🚀 SERVER READY\n🔗 http://localhost:3001\n');
  });
}
