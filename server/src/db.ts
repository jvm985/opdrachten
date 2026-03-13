import sqlite3 from 'sqlite3';
import path from 'path';

// Gebruik een absoluut pad naar de project root om verwarring te voorkomen tussen src/ en dist/
const dbPath = '/home/joachim/develop/ai/exam-net-clone/server/database.sqlite';
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('CREATE TABLE exams Error:', err);
        db.run('ALTER TABLE exams ADD COLUMN labels TEXT', () => {});
        db.run("ALTER TABLE exams ADD COLUMN type TEXT DEFAULT 'examen'", () => {});
        db.run('ALTER TABLE exams ADD COLUMN is_graded INTEGER DEFAULT 1', () => {});
      });

      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL,
          name TEXT NOT NULL
        )
      `, (err) => {
        if (err) return reject(err);
        
        const stmt = db.prepare('INSERT OR IGNORE INTO users (id, email, password, role, name) VALUES (?, ?, ?, ?, ?)');
        stmt.run('t1', 'docent@test.com', 'welkom01', 'teacher', 'Docent Test');
        stmt.run('s1', 'student@test.com', 'welkom01', 'student', 'Student Test');
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
        if (err) return reject(err);
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
        if (err) return reject(err);
      });

      // Students table (from PDF)
      db.run(`
        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          klas TEXT NOT NULL,
          photo_url TEXT
        )
      `, (err) => {
        if (err) return reject(err);
        console.log('Database tables ready.');
        resolve();
      });
    });
  });
};
