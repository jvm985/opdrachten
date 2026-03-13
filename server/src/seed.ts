import { db, initDb } from './db';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Start seeding...');
  await initDb();

  const teacherId = 'teacher-1';
  const teacherName = 'Admin Docent';
  const teacherPassword = 'password123'; // In een echte app zou dit gehasht zijn

  // Check of docent al bestaat
  db.get('SELECT id FROM users WHERE id = ?', [teacherId], (err, row) => {
    if (!row) {
      db.run('INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)', 
        [teacherId, teacherName, 'teacher', teacherPassword], 
        (err) => {
          if (err) console.error('Fout bij maken docent:', err);
          else console.log('✅ Docent aangemaakt: admin / password123');
        }
      );
    }
  });

  // Voorbeeldtoets
  const examId = uuidv4();
  const examKey = 'DEMO123';
  const questions = [
    {
      id: uuidv4(),
      type: 'open',
      text: 'Wat is de hoofdstad van België?',
      points: 2,
      correctAnswer: 'Brussel'
    },
    {
      id: uuidv4(),
      type: 'multiple-choice',
      text: 'Hoeveel zijden heeft een vierkant?',
      points: 1,
      options: ['3', '4', '5', '6'],
      correctAnswer: '4'
    }
  ];

  db.get('SELECT id FROM exams WHERE exam_key = ?', [examKey], (err, row) => {
    if (!row) {
      db.run(
        'INSERT INTO exams (id, teacher_id, title, exam_key, questions, labels, type, is_graded) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [examId, teacherId, 'Demo Toets: Algemene Kennis', examKey, JSON.stringify(questions), JSON.stringify(['Algemeen', 'Demo']), 'toets', 1],
        (err) => {
          if (err) console.error('Fout bij maken demo toets:', err);
          else console.log('✅ Demo toets aangemaakt met code: DEMO123');
        }
      );
    }
  });
}

seed();
