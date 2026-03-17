import fs from 'fs';
const buffer = fs.readFileSync('c:/Users/jassi/Documents/mark 4/sentinal/server.mjs');
console.log(buffer.slice(0, 500).toString('hex'));
console.log(buffer.slice(0, 500).toString('utf8'));
