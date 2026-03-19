import { db, initDb } from './db';
import { randomUUID } from 'crypto';

async function seed() {
  console.log('🌱 Start seeding nieuwe demo...');
  await initDb();

  const teacherId = 'joachim.vanmeirvenne@atheneumkapellen.be'; // Joachim

  const examKey = 'DEMO2026';
  const questions = [
    {
      id: randomUUID(),
      type: 'table-fill',
      text: 'Kenmerken van de Industriële Revolutie. Sleep de termen naar de juiste kolom.',
      points: 4,
      tableData: [
        ['Sector', 'Uitvinding', 'Gevolg'],
        ['Textiel', 'Spinning Jenny', 'Massaproductie'],
        ['Transport', 'Stoomtrein', 'Snellere handel'],
        ['Energie', 'Stoommachine', 'Fabrieken bij steden']
      ],
      tableConfig: {
        mode: 'drag',
        interactiveCells: [
          { r: 1, c: 1 }, { r: 1, c: 2 },
          { r: 2, c: 1 }, { r: 3, c: 2 }
        ],
        ignoreRowOrder: true
      }
    },
    {
      id: randomUUID(),
      type: 'timeline',
      text: 'Belangrijke data in de Belgische geschiedenis.',
      points: 3,
      startYear: 1800,
      endYear: 1950,
      totalBuckets: 6,
      timelineData: [
        [], // 1800-1825
        [{ id: randomUUID(), text: 'Belgische Revolutie (1830)' }],
        [], // 1850-1875
        [{ id: randomUUID(), text: 'Overlijden Leopold I (1865)' }],
        [], // 1900-1925
        [{ id: randomUUID(), text: 'Einde WO II (1945)' }]
      ]
    },
    {
      id: randomUUID(),
      type: 'map',
      text: 'Duid de drie grootste steden van Vlaanderen aan.',
      points: 3,
      image: 'https://www.mapsofworld.com/belgium/maps/belgium-map.jpg',
      locations: [
        { id: randomUUID(), label: 'Antwerpen', x: 45, y: 20 },
        { id: randomUUID(), label: 'Gent', x: 30, y: 30 },
        { id: randomUUID(), label: 'Brugge', x: 15, y: 20 }
      ]
    },
    {
      id: randomUUID(),
      type: 'multiple-choice',
      text: 'Wie was de eerste koning der Belgen?',
      points: 1,
      options: ['Leopold I', 'Leopold II', 'Albert I', 'Boudewijn'],
      correctAnswer: 'Leopold I'
    }
  ];

  db.get('SELECT id FROM exams WHERE exam_key = ?', [examKey], (err, row) => {
    if (!row) {
      db.run(
        'INSERT INTO exams (id, teacher_id, title, exam_key, questions, labels, type, is_graded, is_shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [randomUUID(), teacherId, 'Nieuwe Demo: Geschiedenis & Maatschappij', examKey, JSON.stringify(questions), JSON.stringify(['Geschiedenis', 'Demo']), 'toets', 1, 1],
        (err) => {
          if (err) console.error('Fout bij maken demo toets:', err);
          else console.log(`✅ Nieuwe demo toets aangemaakt: ${examKey}`);
        }
      );
    } else {
      console.log(`ℹ️ Demo toets ${examKey} bestaat al. Wordt niet overschreven om data te sparen.`);
    }
  });
}

seed().catch(err => console.error('Seeding gefaald:', err));
