import fs from 'fs';
const content = fs.readFileSync('c:/Users/jassi/Documents/mark 4/sentinal/server.mjs', 'utf8');
const lines = content.split(/\r?\n/);
let updated = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("import { fileURLToPath } from 'url';") && !content.includes("import fetch from 'node-fetch';")) {
        lines.splice(i + 1, 0, "import fetch from 'node-fetch';");
        updated = true;
        break;
    }
}
if (updated) {
    fs.writeFileSync('c:/Users/jassi/Documents/mark 4/sentinal/server.mjs', lines.join('\r\n'));
    console.log('Successfully updated server.mjs');
} else {
    console.log('Could not find import line or fetch already imported');
}
