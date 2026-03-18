import { db, initDb } from './db';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const pdfFile = path.resolve(__dirname, '../../Fotolijst 6de jaar 12 jan 2026.pdf');
const tempDir = path.resolve(__dirname, 'temp_test_linking');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

async function test() {
  await initDb();
  console.log(`🧐 Test koppeling voor: ${pdfFile}`);
  
  const textFile = path.join(tempDir, 'text.txt');
  execSync(`pdftotext -layout "${pdfFile}" "${textFile}"`);
  const text = fs.readFileSync(textFile, 'utf8');

  const pages = text.split('\f');
  let matchCount = 0;
  let missCount = 0;

  for (const page of pages) {
    const lines = page.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.includes('Klaslijst') || trimmed.includes('Afdrukdatum') || trimmed.includes('SMARTSCHOOL')) continue;
      
      const names = trimmed.split(/\s{2,}/).map(n => n.trim()).filter(n => n.length > 2);
      
      for (const name of names) {
        const pdfWords = name.toLowerCase().replace(/'/g, '').split(/\s+/).filter(w => w.length > 1);
        
        const match: any = await new Promise((resolve) => {
          db.all('SELECT name FROM students', [], (err, rows: any[]) => {
            const found = rows.find(student => {
              const dbName = (student.name || '').toLowerCase().replace(/'/g, '');
              return pdfWords.every(word => dbName.includes(word));
            });
            resolve(found);
          });
        });

        if (match) {
          console.log(`✅ PDF: "${name}" -> DB: "${match.name}"`);
          matchCount++;
        } else {
          console.log(`❌ GEEN MATCH voor: "${name}" (Woorden: ${JSON.stringify(pdfWords)})`);
          missCount++;
        }
      }
    }
  }
  console.log(`\n📊 RESULTAAT: ${matchCount} matches, ${missCount} misses.`);
  process.exit(0);
}

test();
