import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const pdfFile = path.resolve(__dirname, '../../Fotolijst 6de jaar 12 jan 2026.pdf');
const tempDir = path.resolve(__dirname, 'debug_pdf');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

async function debug() {
  console.log('--- START PDF COORDINATE DEBUG ---');
  
  // 1. Maak XML
  const xmlFile = path.join(tempDir, 'layout.xml');
  execSync(`pdftohtml -xml -nodrm "${pdfFile}" "${xmlFile}"`);
  const xml = fs.readFileSync(xmlFile, 'utf8');

  // 2. Krijg images list
  const imgList = execSync(`pdfimages -list "${pdfFile}"`).toString();
  console.log('--- PDFIMAGES LIST ---');
  console.log(imgList.split('\n').slice(0, 20).join('\n'));

  // 3. Analyseer Pagina 1
  const firstPage = xml.split('<page')[1];
  console.log('\n--- PAGE 1 TEXT OBJECTS ---');
  const textRegex = /top="(\d+)" left="(\d+)" width="(\d+)" height="(\d+)"[^>]*>(.*?)<\/text>/g;
  let m;
  while ((m = textRegex.exec(firstPage)) !== null) {
    console.log(`Text: "${m[5]}" | Top: ${m[1]}, Left: ${m[2]}`);
  }

  console.log('\n--- PAGE 1 IMAGE OBJECTS ---');
  const imgRegex = /<image top="(\d+)" left="(\d+)" width="(\d+)" height="(\d+)"[^>]*\/>/g;
  while ((m = imgRegex.exec(firstPage)) !== null) {
    console.log(`Image | Top: ${m[1]}, Left: ${m[2]}`);
  }
}

debug();
