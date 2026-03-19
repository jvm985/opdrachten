import { db, initDb } from './db';
import { randomUUID } from 'crypto';

async function createDemo() {
  console.log('🌱 Start creating demo data...');
  await initDb();

  const teacherId = 'joachim.vanmeirvenne@atheneumkapellen.be';
  const examKey = 'DEMO-ALGEMENE-KENNIS';

  // Check if exam already exists
  const existingExam: any = await new Promise((resolve) => {
    db.get('SELECT id FROM exams WHERE exam_key = ?', [examKey], (err, row) => resolve(row));
  });

  if (existingExam) {
    console.log(`ℹ️ Demo exam ${examKey} already exists. Skipping creation.`);
    process.exit(0);
  }

  const examId = randomUUID();
  const questions = [
    {
      id: 'q1',
      type: 'open',
      text: 'Wat is de hoofdstad van België?',
      points: 2,
      correctAnswer: 'Brussel'
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      text: 'Hoeveel continenten zijn er?',
      options: ['5', '6', '7', '8'],
      points: 1,
      correctAnswer: '7'
    },
    {
      id: 'q3',
      type: 'true-false',
      text: 'De zon is een planeet.',
      points: 1,
      correctAnswer: 'Onwaar'
    },
    {
      id: 'q4',
      type: 'table-fill',
      text: 'Vul de ontbrekende gegevens in de tabel aan.',
      points: 3,
      tableData: [
        ['Land', 'Hoofdstad'],
        ['Nederland', 'Amsterdam'],
        ['Duitsland', 'Berlijn'],
        ['Frankrijk', 'Parijs']
      ],
      tableConfig: {
        mode: 'type',
        interactiveCells: [{ r: 1, c: 1 }, { r: 2, c: 1 }, { r: 3, c: 1 }]
      }
    }
  ];

  // 1. Create Exam
  await new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO exams (id, teacher_id, title, exam_key, questions, labels, type, is_graded, require_fullscreen, detect_tab_switch, is_shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [examId, teacherId, 'Demo Toets: Algemene Kennis', examKey, JSON.stringify(questions), JSON.stringify(['Demo']), 'toets', 1, 0, 0, 0],
      (err) => {
        if (err) reject(err);
        else {
          console.log(`✅ Exam created with Key: ${examKey}`);
          resolve(true);
        }
      }
    );
  });

  // 2. Create 10 Submissions
  const submissions = [
    { name: 'Alice A.', klas: '6A', answers: { q1: 'Brussel', q2: '7', q3: 'Onwaar', q4: { '1-1': 'Amsterdam', '2-1': 'Berlijn', '3-1': 'Parijs' } } },
    { name: 'Bob B.', klas: '6A', answers: { q1: 'Brussel', q2: '7', q3: 'Onwaar', q4: { '1-1': 'Amsterdam', '2-1': 'Berlijn', '3-1': 'Parijs' } } },
    { name: 'Charlie C.', klas: '6B', answers: { q1: 'Antwerpen', q2: '5', q3: 'Waar', q4: { '1-1': 'Rotterdam', '2-1': 'Munchen', '3-1': 'Lyon' } } },
    { name: 'Daisy D.', klas: '6A', answers: { q1: 'Brussel', q2: '7', q3: 'Onwaar', q4: { '1-1': 'Amsterdam', '2-1': 'Berlijn', '3-1': 'Parijs' } } },
    { name: 'Edward E.', klas: '6B', answers: { q1: 'Brussel', q2: '6', q3: 'Onwaar', q4: { '1-1': 'Amsterdam', '2-1': 'Berlijn', '3-1': 'Parijs' } } },
    { name: 'Fiona F.', klas: '6A', answers: { q1: 'Brussel', q2: '7', q3: 'Onwaar', q4: { '1-1': 'Amsterdam', '2-1': 'Berlijn', '3-1': 'Parijs' } } },
    { name: 'George G.', klas: '6B', answers: { q1: 'Gent', q2: '7', q3: 'Waar', q4: { '1-1': 'Amsterdam', '2-1': 'Berlijn', '3-1': 'Parijs' } } },
    { name: 'Hannah H.', klas: '6A', answers: { q1: 'Brussel', q2: '7', q3: 'Onwaar', q4: { '1-1': 'Amsterdam', '2-1': 'Berlijn', '3-1': 'Parijs' } } },
    { name: 'Ian I.', klas: '6B', answers: { q1: 'Brugge', q2: '7', q3: 'Onwaar', q4: { '1-1': 'Amsterdam', '2-1': 'Berlijn', '3-1': 'Lille' } } },
    { name: 'Julia J.', klas: '6A', answers: { q1: 'Brussel', q2: '7', q3: 'Onwaar', q4: { '1-1': 'Amsterdam', '2-1': 'Berlijn', '3-1': 'Parijs' } } },
  ];

  for (const s of submissions) {
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO submissions (id, exam_id, student_name, student_klas, answers) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), examId, s.name, s.klas, JSON.stringify(s.answers)],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`📩 Submission added for ${s.name}`);
            resolve(true);
          }
        }
      );
    });
  }

  console.log('\n✨ Demo data setup complete!');
  process.exit(0);
}

createDemo().catch(err => {
  console.error('❌ Error creating demo:', err);
  process.exit(1);
});
