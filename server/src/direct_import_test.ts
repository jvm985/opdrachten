import { db, initDb } from './db';
import * as XLSX from 'xlsx';
import path from 'path';

async function test() {
  console.log('🚀 Start directe import test...');
  await initDb();

  const filePath = path.resolve(__dirname, '../../Hele school leerlingen 12 januari 2026.xlsx');
  console.log(`📂 Bestandspad: ${filePath}`);

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    console.log(`📑 Sheet gevonden: ${sheetName}`);
    
    const worksheet = workbook.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);
    console.log(`📊 Totaal aantal rijen ingelezen door XLSX: ${rawData.length}`);

    if (rawData.length === 0) {
      console.log('❌ De sheet lijkt leeg te zijn of kon niet worden ingelezen.');
      return;
    }

    console.log('📝 Headers gedetecteerd in eerste rij:', Object.keys(rawData[0]));

    let count = 0;
    for (const row of rawData) {
      const keys = Object.keys(row);
      const findVal = (target: string) => {
        const key = keys.find(k => k.trim().toLowerCase() === target.toLowerCase());
        return key ? row[key] : '';
      };

      const voornaam = (findVal('Voornaam') || '').toString().trim();
      const achternaam = (findVal('Naam') || '').toString().trim();
      const klas = (findVal('Klas- of groepsnaam') || '').toString().trim();

      if (voornaam || achternaam) {
        const fullName = `${voornaam} ${achternaam}`.trim();
        await new Promise((resolve) => {
          db.run('INSERT INTO students (name, first_name, last_name, klas) VALUES (?, ?, ?, ?)', 
            [fullName, voornaam, achternaam, klas], (err) => {
              if (!err) count++;
              resolve(true);
            });
        });
      }
    }

    console.log(`✅ TEST VOLTOOID: ${count} leerlingen toegevoegd aan de database.`);
  } catch (err) {
    console.error('❌ FOUT TIJDENS TEST:', err);
  }
  process.exit(0);
}

test();
