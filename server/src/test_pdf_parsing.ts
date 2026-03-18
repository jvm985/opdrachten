import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const pdfFile = path.resolve(__dirname, '../../Fotolijst 6de jaar 12 jan 2026.pdf');
const tempDir = path.resolve(__dirname, 'temp_test_pdf');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

async function test() {
  console.log(`🧐 Analyseren van: ${pdfFile}`);
  
  // 1. Extraheer tekst
  const textFile = path.join(tempDir, 'text.txt');
  execSync(`pdftotext -layout "${pdfFile}" "${textFile}"`);
  const text = fs.readFileSync(textFile, 'utf8');
  console.log('--- TEKST SAMPLE (Eerste 500 tekens) ---');
  console.log(text.substring(0, 500));
  console.log('----------------------------------------');

  // 2. Extraheer afbeeldingen
  console.log('📸 Afbeeldingen extraheren...');
  execSync(`pdfimages -j "${pdfFile}" "${path.join(tempDir, 'img')}"`);
  const images = fs.readdirSync(tempDir).filter(f => f.startsWith('img-'));
  console.log(`🖼️ Aantal afbeeldingen gevonden: ${images.length}`);

  // 3. Test matching logica (zoals in de server)
  const pages = text.split('\f');
  console.log(`📄 Aantal pagina's: ${pages.length}`);

  for (const page of pages) {
    const lines = page.split('\n');
    const klasMatch = page.match(/Klaslijst \(([^)]+)\)/);
    if (klasMatch) {
      console.log(`📍 Klas gevonden op pagina: ${klasMatch[1]}`);
    }

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.includes('Klaslijst') || trimmed.includes('Afdrukdatum') || trimmed.includes('SMARTSCHOOL')) continue;
      
      const names = trimmed.split(/\s{2,}/).map(n => n.trim()).filter(n => n.length > 2);
      if (names.length > 0) {
        console.log(`👤 Gevonden namen op regel: ${JSON.stringify(names)}`);
      }
    }
  }
}

test().catch(console.error);
