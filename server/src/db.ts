import sqlite3 from 'sqlite3';
import path from 'path';

// Gebruik een pad relatief aan de huidige directory om overal te werken (Docker, lokaal, etc.)
const dbPath = path.resolve(__dirname, '../../database.sqlite');
console.log('Database path:', dbPath);
export const db = new sqlite3.Database(dbPath);

export const initDb = () => {
  return new Promise<void>((resolve, reject) => {
    console.log('Initializing Database...');
    db.serialize(() => {
      // Exams table
      db.run(`
        CREATE TABLE IF NOT EXISTS exams (
          id TEXT PRIMARY KEY,
          teacher_id TEXT NOT NULL,
          title TEXT NOT NULL,
          exam_key TEXT UNIQUE NOT NULL,
          questions TEXT NOT NULL,
          labels TEXT,
          type TEXT DEFAULT 'examen',
          is_graded INTEGER DEFAULT 1,
          require_fullscreen INTEGER DEFAULT 1,
          detect_tab_switch INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('CREATE TABLE exams Error:', err);
        db.run('ALTER TABLE exams ADD COLUMN labels TEXT', () => {});
        db.run("ALTER TABLE exams ADD COLUMN type TEXT DEFAULT 'examen'", () => {});
        db.run('ALTER TABLE exams ADD COLUMN is_graded INTEGER DEFAULT 1', () => {});
        db.run('ALTER TABLE exams ADD COLUMN require_fullscreen INTEGER DEFAULT 1', () => {});
        db.run('ALTER TABLE exams ADD COLUMN detect_tab_switch INTEGER DEFAULT 1', () => {});
      });

      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL,
          name TEXT NOT NULL,
          two_factor_secret TEXT,
          two_factor_enabled INTEGER DEFAULT 0,
          webauthn_devices TEXT
        )
      `, (err: any) => {
        if (err) console.error('CREATE TABLE users Error:', err);
        db.run('ALTER TABLE users ADD COLUMN email TEXT', () => {});
        db.run('ALTER TABLE users ADD COLUMN two_factor_secret TEXT', () => {});
        db.run('ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0', () => {});
        db.run('ALTER TABLE users ADD COLUMN webauthn_devices TEXT', () => {});
        
        const stmt = db.prepare('INSERT OR IGNORE INTO users (id, email, password, role, name) VALUES (?, ?, ?, ?, ?)');
        stmt.run('t1', 'docent@test.com', 'welkom01', 'teacher', 'Docent Test');
        stmt.run('s1', 'student@test.com', 'welkom01', 'student', 'Student Test');
        
        // Atheneum Kapellen Docenten
        stmt.run('teacher-1', 'joachim.vanmeirvenne@atheneumkapellen.be', 'google-auth', 'teacher', 'Joachim Van Meirvenne');
        stmt.run('teacher-2', 'wim.benda@atheneumkapellen.be', 'google-auth', 'teacher', 'Wim Benda');
        stmt.run('teacher-3', 'cedric.denhond@atheneumkapellen.be', 'google-auth', 'teacher', 'Cedric Den Hond');
        stmt.run('teacher-4', 'marc.vaneijmeren@atheneumkapellen.be', 'google-auth', 'teacher', 'Marc Van Eijmeren');
        stmt.run('teacher-5', 'kurt.vermeiren@atheneumkapellen.be', 'google-auth', 'teacher', 'Kurt Vermeiren');
        stmt.run('teacher-6', 'laura.vanaert@atheneumkapellen.be', 'google-auth', 'teacher', 'Laura Van Aert');
        
        stmt.finalize();
      });

      // Submissions table
      db.run(`
        CREATE TABLE IF NOT EXISTS submissions (
          id TEXT PRIMARY KEY,
          exam_id TEXT NOT NULL,
          student_name TEXT NOT NULL,
          student_klas TEXT,
          answers TEXT NOT NULL, -- JSON
          scores TEXT, -- JSON object met punten per vraag
          submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('CREATE TABLE submissions Error:', err);
        db.run('ALTER TABLE submissions ADD COLUMN scores TEXT', () => {});
        db.run('ALTER TABLE submissions ADD COLUMN student_klas TEXT', () => {});
      });

      // Question Bank table
      db.run(`
        CREATE TABLE IF NOT EXISTS questions_bank (
          id TEXT PRIMARY KEY,
          teacher_id TEXT NOT NULL,
          type TEXT NOT NULL,
          text TEXT NOT NULL,
          points INTEGER NOT NULL,
          data TEXT NOT NULL, -- JSON for type-specific data
          labels TEXT, -- JSON array
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('CREATE TABLE questions_bank Error:', err);
      });

      // Students table (from PDF)
      db.run(`
        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          klas TEXT NOT NULL,
          email TEXT UNIQUE,
          photo_url TEXT
        )
      `, (err) => {
        if (err) return reject(err);
        db.run('ALTER TABLE students ADD COLUMN email TEXT', () => {});
        console.log('Database tables ready.');
        resolve();
      });
    });
  });
};
