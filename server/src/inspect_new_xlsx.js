const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../User_Download_22032026_192748_File.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Headers:', Object.keys(data[0]));
console.log('Sample Row:', data[0]);
