import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const listsDir = path.resolve(__dirname, '../../leerling_lijsten');
const photoSourceDir = path.resolve(__dirname, 'temp_photos');
const photoDestDir = path.resolve(__dirname, '../public/photos');

if (!fs.existsSync(photoSourceDir)) fs.mkdirSync(photoSourceDir, { recursive: true });
if (!fs.existsSync(photoDestDir)) fs.mkdirSync(photoDestDir, { recursive: true });

async function run() {
  console.log('Clearing old data...');
  db.serialize(() => {
    db.run('DELETE FROM students');
    // Reset autoincrement
    db.run('DELETE FROM sqlite_sequence WHERE name="students"');
  });

  const files = fs.readdirSync(listsDir).filter(f => f.endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files.`);

  let globalPhotoCounter = 0;

  for (const file of files) {
    console.log(`Processing ${file}...`);
    const filePath = path.join(listsDir, file);
    
    // Clear temp dir
    fs.readdirSync(photoSourceDir).forEach(f => fs.unlinkSync(path.join(photoSourceDir, f)));

    // Extract images
    execSync(`pdfimages -j "${filePath}" "${path.join(photoSourceDir, 'img')}"`);
    
    // Extract text
    const textPath = path.join(photoSourceDir, 'list.txt');
    execSync(`pdftotext -layout "${filePath}" "${textPath}"`);
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

      // Find names line. Names are typically on lines that don't contain "Klaslijst", "Afdrukdatum", "SMARTSCHOOL", etc.
      // And they are separated by multiple spaces.
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.includes('Klaslijst') || trimmed.includes('Afdrukdatum') || trimmed.includes('SMARTSCHOOL') || trimmed === '1') continue;

        // Split by 2 or more spaces to get names
        const names = trimmed.split(/\s{2,}/).map(n => n.trim()).filter(n => n.length > 2);
        
        for (const name of names) {
          const ppmFile = path.join(photoSourceDir, `img-${String(ppmCounter * 2).padStart(3, '0')}.ppm`);
          const jpgName = `student_${globalPhotoCounter}.jpg`;
          const destPath = path.join(photoDestDir, jpgName);

          if (fs.existsSync(ppmFile)) {
            try {
              execSync(`magick convert "${ppmFile}" "${destPath}"`);
              const photoUrl = `/photos/${jpgName}`;
              
              db.run('INSERT INTO students (name, klas, photo_url) VALUES (?, ?, ?)', [name, currentKlas, photoUrl]);
              console.log(`[${currentKlas}] Added: ${name}`);
            } catch (err) {
              console.error(`Error converting ${ppmFile}:`, err);
            }
          } else {
            // Check for other image types if -j didn't work as expected
            const jpgFile = path.join(photoSourceDir, `img-${String(ppmCounter * 2).padStart(3, '0')}.jpg`);
            if (fs.existsSync(jpgFile)) {
               fs.copyFileSync(jpgFile, destPath);
               db.run('INSERT INTO students (name, klas, photo_url) VALUES (?, ?, ?)', [name, currentKlas, `/photos/${jpgName}`]);
               console.log(`[${currentKlas}] Added (JPG): ${name}`);
            } else {
               console.warn(`Photo not found for ${name} at index ${ppmCounter*2}`);
            }
          }
          ppmCounter++;
          globalPhotoCounter++;
        }
      }
    }
  }
  console.log('Import complete.');
}

run();
