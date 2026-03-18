import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Use the database in the root folder
const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

const listsDir = path.resolve(__dirname, '../../leerling_lijsten');
const photoSourceDir = path.resolve(__dirname, 'temp_photos');
const photoDestDir = path.resolve(__dirname, '../public/photos');

if (!fs.existsSync(photoSourceDir)) fs.mkdirSync(photoSourceDir, { recursive: true });
if (!fs.existsSync(photoDestDir)) fs.mkdirSync(photoDestDir, { recursive: true });

async function run() {
  // Check if students already exist
  const count: number = await new Promise((resolve) => {
    db.get('SELECT COUNT(*) as count FROM students', (err, row: any) => resolve(row?.count || 0));
  });

  if (count > 0) {
    console.log(`ℹ️ There are already ${count} students in the database. Skipping import to prevent duplicates.`);
    process.exit(0);
  }

  console.log('🌱 Starting student import from PDFs...');

  const files = fs.readdirSync(listsDir).filter(f => f.endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files.`);

  let globalPhotoCounter = 0;

  for (const file of files) {
    console.log(`Processing ${file}...`);
    const filePath = path.join(listsDir, file);
    
    // Clear temp dir
    fs.readdirSync(photoSourceDir).forEach(f => {
        if (f !== '.gitkeep') fs.unlinkSync(path.join(photoSourceDir, f));
    });

    // Extract images
    try {
        execSync(`pdfimages -j "${filePath}" "${path.join(photoSourceDir, 'img')}"`);
    } catch (e) {
        console.error(`Error extracting images from ${file}`);
    }
    
    // Extract text
    const textPath = path.join(photoSourceDir, 'list.txt');
    try {
        execSync(`pdftotext -layout "${filePath}" "${textPath}"`);
    } catch (e) {
        console.error(`Error extracting text from ${file}`);
        continue;
    }
    
    if (!fs.existsSync(textPath)) continue;
    const text = fs.readFileSync(textPath, 'utf8');

    // Parse text
    const pages = text.split('\f');
    let ppmCounter = 0;

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
          const jpgName = `student_${globalPhotoCounter}.jpg`;
          const destPath = path.join(photoDestDir, jpgName);

          let photoStored = false;

          if (fs.existsSync(ppmFile)) {
            try {
              execSync(`magick convert "${ppmFile}" "${destPath}"`);
              photoStored = true;
            } catch (err) {
              console.error(`Error converting ${ppmFile}:`, err);
            }
          } else {
            const jpgFile = path.join(photoSourceDir, `img-${String(ppmCounter * 2).padStart(3, '0')}.jpg`);
            if (fs.existsSync(jpgFile)) {
               fs.copyFileSync(jpgFile, destPath);
               photoStored = true;
            }
          }

          const photoUrl = photoStored ? `/photos/${jpgName}` : null;
          db.run('INSERT INTO students (name, klas, photo_url) VALUES (?, ?, ?)', [name, currentKlas, photoUrl]);
          console.log(`[${currentKlas}] Added: ${name}`);
          
          ppmCounter++;
          globalPhotoCounter++;
        }
      }
    }
  }
  console.log('Import complete.');
  process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
