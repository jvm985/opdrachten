import sqlite3 from 'sqlite3';
import path from 'path';

// Gebruik process.cwd() om altijd de root van het project/container te vinden
const dbPath = path.resolve(process.cwd(), 'database.sqlite');
console.log('Database path:', dbPath);
export const db = new sqlite3.Database(dbPath);

const runAsync = (sql: string, params: any[] = []) => {
  return new Promise<void>((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const initDb = async () => {
  console.log('Initializing Database...');
  
  try {
    // Exams table
    await runAsync(`
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
        is_shared INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Altijd kolommen proberen toe te voegen (negeert fout als ze al bestaan)
    await runAsync('ALTER TABLE exams ADD COLUMN labels TEXT').catch(() => {});
    await runAsync("ALTER TABLE exams ADD COLUMN type TEXT DEFAULT 'examen'").catch(() => {});
    await runAsync('ALTER TABLE exams ADD COLUMN is_graded INTEGER DEFAULT 1').catch(() => {});
    await runAsync('ALTER TABLE exams ADD COLUMN require_fullscreen INTEGER DEFAULT 1').catch(() => {});
    await runAsync('ALTER TABLE exams ADD COLUMN detect_tab_switch INTEGER DEFAULT 1').catch(() => {});
    await runAsync('ALTER TABLE exams ADD COLUMN is_shared INTEGER DEFAULT 0').catch(() => {});
    await runAsync('ALTER TABLE exams ADD COLUMN is_deleted INTEGER DEFAULT 0').catch(() => {});

    // Users table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        two_factor_secret TEXT,
        two_factor_enabled INTEGER DEFAULT 0,
        webauthn_devices TEXT
      )
    `);
    await runAsync('ALTER TABLE users ADD COLUMN first_name TEXT').catch(() => {});
    await runAsync('ALTER TABLE users ADD COLUMN last_name TEXT').catch(() => {});

    // Default users
    const stmt = db.prepare('INSERT OR IGNORE INTO users (id, email, password, role, name) VALUES (?, ?, ?, ?, ?)');
    stmt.run('docent@test.com', 'docent@test.com', 'welkom01', 'teacher', 'Docent Test');
    stmt.run('student@test.com', 'student@test.com', 'welkom01', 'student', 'Student Test');
    stmt.run('joachim.vanmeirvenne@atheneumkapellen.be', 'joachim.vanmeirvenne@atheneumkapellen.be', 'GoogleAuthOnly', 'teacher', 'Joachim Van Meirvenne');
    stmt.finalize();

    // Submissions table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        exam_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        student_klas TEXT,
        answers TEXT NOT NULL,
        scores TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Questions bank
    await runAsync(`
      CREATE TABLE IF NOT EXISTS questions_bank (
        id TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL,
        type TEXT NOT NULL,
        text TEXT NOT NULL,
        points INTEGER NOT NULL,
        data TEXT NOT NULL,
        labels TEXT,
        is_shared INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Students
    await runAsync(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        klas TEXT NOT NULL,
        email TEXT UNIQUE,
        photo_url TEXT
      )
    `);
    await runAsync('ALTER TABLE students ADD COLUMN first_name TEXT').catch(() => {});
    await runAsync('ALTER TABLE students ADD COLUMN last_name TEXT').catch(() => {});
    await runAsync('ALTER TABLE students ADD COLUMN email TEXT').catch(() => {});

    console.log('✅ Database initialization complete.');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
    throw err;
  }
};
