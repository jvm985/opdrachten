import { db, initDb } from './db';
import { randomUUID } from 'crypto';

async function seed() {
  console.log('🌱 Start seeding...');
  await initDb();

  const teachers = [
    { id: 'teacher-1', name: 'Joachim Van Meirvenne', email: 'joachim.vanmeirvenne@atheneumkapellen.be' },
    { id: 'teacher-2', name: 'Wim Benda', email: 'wim.benda@atheneumkapellen.be' },
    { id: 'teacher-3', name: 'Cedric Den Hond', email: 'cedric.denhond@atheneumkapellen.be' },
    { id: 'teacher-4', name: 'Marc Van Eijmeren', email: 'marc.vaneijmeren@atheneumkapellen.be' },
    { id: 'teacher-5', name: 'Kurt Vermeiren', email: 'kurt.vermeiren@atheneumkapellen.be' },
    { id: 'teacher-6', name: 'Laura Van Aert', email: 'laura.vanaert@atheneumkapellen.be' },
  ];

  teachers.forEach(t => {
    db.run('INSERT OR REPLACE INTO users (id, name, email, role, password) VALUES (?, ?, ?, ?, ?)', 
      [t.id, t.name, t.email, 'teacher', 'GoogleAuthOnly'], 
      (err) => {
        if (err) console.error('Fout bij maken docent:', err);
        else console.log(`✅ Docent aangemaakt/bijgewerkt: ${t.email}`);
      }
    );
  });

  // Uitgebreide Demo Toets met alle vraagtypes
  const examKey = 'ALLTYPES';
  const questions = [
    {
      id: randomUUID(),
      type: 'open',
      text: 'Leg kort uit wat het concept "Trias Politica" van Montesquieu inhoudt.',
      points: 4,
      correctAnswer: 'De scheiding van de drie staatsmachten: de wetgevende, de uitvoerende en de rechterlijke macht. Het doel is om machtsmisbruik te voorkomen.'
    },
    {
      id: randomUUID(),
      type: 'multiple-choice',
      text: 'Welke van de volgende landen is geen lid van de Europese Unie?',
      points: 1,
      options: ['Noorwegen', 'Zweden', 'Finland', 'Denemarken'],
      correctAnswer: 'Noorwegen'
    },
    {
      id: randomUUID(),
      type: 'true-false',
      text: 'De Eerste Wereldoorlog begon in het jaar 1914.',
      points: 1,
      correctAnswer: 'Waar',
      explainIfFalse: false
    },
    {
      id: randomUUID(),
      type: 'map',
      text: 'Duid de volgende provinciehoofdsteden aan op de kaart van België.',
      points: 3,
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Belgi%C3%AB_provincies_blank.png/800px-Belgi%C3%AB_provincies_blank.png',
      locations: [
        { id: randomUUID(), label: 'Antwerpen', x: 45, y: 30 },
        { id: randomUUID(), label: 'Brussel', x: 48, y: 55 },
        { id: randomUUID(), label: 'Gent', x: 25, y: 40 }
      ]
    },
    {
      id: randomUUID(),
      type: 'definitions',
      text: 'Geef de correcte term voor de onderstaande definities.',
      points: 4,
      pairs: [
        { id: randomUUID(), definition: 'Een plotselinge en gewelddadige overname van de staatsmacht.', term: 'Staatsgreep' },
        { id: randomUUID(), definition: 'Een economisch systeem gebaseerd op privaat bezit en winstbejag.', term: 'Kapitalisme' }
      ]
    },
    {
      id: randomUUID(),
      type: 'matching',
      text: 'Koppel de bekende historische figuren aan hun prestatie.',
      points: 3,
      matchingPairs: [
        { id: randomUUID(), left: 'Napoleon Bonaparte', right: 'Slag bij Waterloo' },
        { id: randomUUID(), left: 'Albert Einstein', right: 'Relativiteitstheorie' },
        { id: randomUUID(), left: 'Marie Curie', right: 'Radioactiviteit' }
      ]
    },
    {
      id: randomUUID(),
      type: 'ordering',
      text: 'Zet de volgende gebeurtenissen in chronologische volgorde (van oud naar nieuw).',
      points: 4,
      orderItems: ['De Franse Revolutie', 'De Industriële Revolutie', 'De Eerste Wereldoorlog', 'De landing op de maan'],
      orderDirection: 'vertical'
    },
    {
      id: randomUUID(),
      type: 'image-analysis',
      text: 'Bestudeer de onderstaande bron over de bevolkingsgroei en beantwoord de vragen.',
      points: 4,
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/World_population_growth_rate_1950%E2%80%932050.svg/1200px-World_population_growth_rate_1950%E2%80%932050.svg.png',
      subQuestions: [
        { id: randomUUID(), text: 'In welk decennium bereikte de groeivoet zijn piek?', points: 2 },
        { id: randomUUID(), text: 'Geef een mogelijke reden voor de daling na 1970.', points: 2 }
      ]
    }
  ];

  db.get('SELECT id FROM exams WHERE exam_key = ?', [examKey], (err, row) => {
    if (!row) {
      db.run(
        'INSERT INTO exams (id, teacher_id, title, exam_key, questions, labels, type, is_graded) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [randomUUID(), teachers[0].id, 'Demo Toets: Alle Vraagtypes', examKey, JSON.stringify(questions), JSON.stringify(['Demo', 'Masterclass']), 'toets', 1],
        (err) => {
          if (err) console.error('Fout bij maken demo toets:', err);
          else console.log(`✅ Demo toets aangemaakt met code: ${examKey}`);
        }
      );
    } else {
      // Update bestaande demo toets
      db.run(
        'UPDATE exams SET questions = ?, title = ? WHERE exam_key = ?',
        [JSON.stringify(questions), 'Demo Toets: Alle Vraagtypes (Bijgewerkt)', examKey],
        (err) => {
          if (err) console.error('Fout bij updaten demo toets:', err);
          else console.log(`✅ Demo toets bijgewerkt: ${examKey}`);
        }
      );
    }
  });
}

seed().catch(err => console.error('Seeding gefaald:', err));
