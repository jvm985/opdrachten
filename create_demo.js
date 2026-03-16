const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';
const TEACHER_ID = 't1';

async function createDemo() {
  // 1. Create Exam
  const examResponse = await fetch(`${API_BASE}/exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teacherId: TEACHER_ID,
      title: 'Demo Examen: Geschiedenis & Wetenschap',
      type: 'examen',
      isGraded: true,
      labels: ['Demo', '2026'],
      questions: [
        {
          id: 'q1',
          type: 'open',
          text: 'Wie was de eerste president van de Verenigde Staten?',
          points: 5,
          correctAnswer: 'George Washington'
        },
        {
          id: 'q2',
          type: 'multiple-choice',
          text: 'Wat is de hoofdstad van Frankrijk?',
          options: ['Lyon', 'Marseille', 'Parijs', 'Bordeaux'],
          points: 2,
          correctAnswer: 'Parijs'
        },
        {
          id: 'q3',
          type: 'true-false',
          text: 'De aarde draait om de zon.',
          points: 1,
          correctAnswer: 'Waar'
        }
      ]
    })
  });

  const examData = await examResponse.json();
  const examId = examData.id;
  console.log(`✅ Exam created with ID: ${examId}, Key: ${examData.examKey}`);

  // 2. Create 10 Submissions
  const students = [
    { name: 'Jan Jansen', klas: '6A', answers: { q1: 'George Washington', q2: 'Parijs', q3: 'Waar' } },
    { name: 'Piet Peters', klas: '6A', answers: { q1: 'Washington', q2: 'Parijs', q3: 'Waar' } },
    { name: 'Maria Maes', klas: '6B', answers: { q1: 'George Washington', q2: 'Lyon', q3: 'Waar' } },
    { name: 'An Alens', klas: '6A', answers: { q1: 'George Washington', q2: 'Parijs', q3: 'Waar' } },
    { name: 'Bram Bos', klas: '6B', answers: { q1: 'Abraham Lincoln', q2: 'Parijs', q3: 'Onwaar' } },
    { name: 'Celine Coenen', klas: '6A', answers: { q1: 'George Washington', q2: 'Parijs', q3: 'Waar' } },
    { name: 'Dirk Deckers', klas: '6B', answers: { q1: 'Washington', q2: 'Marseille', q3: 'Waar' } },
    { name: 'Eva Eykens', klas: '6A', answers: { q1: 'George Washington', q2: 'Parijs', q3: 'Waar' } },
    { name: 'Frank Fimmers', klas: '6B', answers: { q1: 'Napoleon', q2: 'Parijs', q3: 'Waar' } },
    { name: 'Gitta Geerts', klas: '6A', answers: { q1: 'George Washington', q2: 'Parijs', q3: 'Waar' } },
  ];

  for (const student of students) {
    const subRes = await fetch(`${API_BASE}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId,
        name: student.name,
        klas: student.klas,
        answers: student.answers
      })
    });
    if (subRes.ok) {
      console.log(`📩 Submission added for ${student.name}`);
    } else {
      console.error(`❌ Failed for ${student.name}`);
    }
  }

  console.log('\n✨ Demo setup complete!');
}

createDemo();
