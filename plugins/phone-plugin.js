import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

function findContactsDB() {
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) return null;

    const defaultPath = path.join(localAppData, 'Packages', 'Microsoft.YourPhone_8wekyb3d8bbwe', 'LocalCache', 'Indexed');
    if (!fs.existsSync(defaultPath)) return null;

    try {
        const dirs = fs.readdirSync(defaultPath);
        for (const dir of dirs) {
            const dbPath = path.join(defaultPath, dir, 'System', 'Database', 'contacts.db');
            if (fs.existsSync(dbPath)) return dbPath;
        }
    } catch (e) {
        console.error('[PHONE] Error scanning AppData directory:', e);
    }
    return null;
}

const plugin = {
    name: 'Phone Call Integration',
    version: '2.0.0',
    description: 'Initiates phone calls. Automatically searches Windows Phone Link synchronized contacts, falling back to local manual contacts if needed.',

    initialize() {
        console.log('[PHONE] Phone Call System Online (Syncing with Phone Link SQLite)');

        // Ensure manual contacts fallback exists
        const contactsPath = path.join(process.cwd(), 'data', 'contacts.json');
        if (!fs.existsSync(contactsPath)) {
            fs.writeFileSync(contactsPath, JSON.stringify({
                "emergency": "911"
            }, null, 2));
        }
    },

    canHandle(intent, userInput) {
        return (
            intent === 'system.call' ||
            /\b(call|dial|phone|ring)\b/i.test(userInput)
        );
    },

    async handle(intent, userInput, context) {
        const match = userInput.match(/(?:call|phone|dial|ring(?: up)?)\s+(.+)/i);
        let contactName = match ? match[1].trim() : null;

        if (!contactName) {
            return {
                success: false,
                message: 'Please specify who or what number you would like me to call, Sir.'
            };
        }

        let phoneNumber = null;

        // 1. Try resolving via actual Windows Phone Link Database
        const dbPath = findContactsDB();
        let tempDbPath = null;

        if (dbPath) {
            try {
                // We must copy the DB to avoid file locking issues from Phone Link sync
                tempDbPath = path.join(process.cwd(), `temp_contacts_${Date.now()}.db`);
                fs.copyFileSync(dbPath, tempDbPath);

                const db = new DatabaseSync(tempDbPath);

                // Query the database for a matching display_name using LIKE for case-insensitive partial/full match
                const query = db.prepare(`
                    SELECT p.phone_number 
                    FROM contact c 
                    JOIN phonenumber p ON c.contact_id = p.contact_id 
                    WHERE c.display_name LIKE ? OR c.nickname LIKE ?
                    LIMIT 1
                `);

                const result = query.all(`%${contactName}%`, `%${contactName}%`);
                if (result && result.length > 0 && result[0].phone_number) {
                    phoneNumber = result[0].phone_number;
                    console.log(`[PHONE] Found contact ${contactName} in Phone Link DB: ${phoneNumber}`);
                }

                db.close();
            } catch (e) {
                console.error('[PHONE] Error querying Phone Link database:', e);
            } finally {
                if (tempDbPath && fs.existsSync(tempDbPath)) {
                    try { fs.unlinkSync(tempDbPath); } catch (err) { }
                }
            }
        }

        // 2. Fallback to manual contacts.json if not found in Phone Link
        if (!phoneNumber) {
            const contactsPath = path.join(process.cwd(), 'data', 'contacts.json');
            try {
                if (fs.existsSync(contactsPath)) {
                    const contacts = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
                    for (const key in contacts) {
                        if (key.toLowerCase().includes(contactName.toLowerCase())) {
                            phoneNumber = contacts[key];
                            console.log(`[PHONE] Found contact ${contactName} in manual contacts.json fallback.`);
                            break;
                        }
                    }
                }
            } catch (e) {
                console.error('[PHONE] Error reading contacts.json:', e);
            }
        }

        // 3. Fallback to direct number parsing (if the user said "dial 1234567")
        const isDirectNumber = /^[+\-\d\s()]+$/.test(contactName);
        if (isDirectNumber && /\d/.test(contactName)) {
            phoneNumber = contactName.replace(/[^\d+]/g, '');
        }

        const dialedTarget = phoneNumber || contactName.replace(/\s+/g, '');

        if (/[&|;>\\<]/.test(dialedTarget)) {
            return {
                success: false,
                message: 'Invalid characters in phone number sequence, Sir.'
            };
        }

        return new Promise((resolve) => {
            let command;

            if (process.platform === 'win32') {
                const psScript = `
start tel:${dialedTarget}
Start-Sleep -Seconds 1
$wshell = New-Object -ComObject wscript.shell
for ($i = 0; $i -lt 6; $i++) {
    if ($wshell.AppActivate('Phone Link')) {
        Start-Sleep -Milliseconds 800
        $wshell.SendKeys('{ENTER}')
        Start-Sleep -Milliseconds 200
        $wshell.SendKeys(' ')
        Start-Sleep -Milliseconds 200
        $wshell.SendKeys('{ENTER}')
        break
    }
    Start-Sleep -Milliseconds 500
}
`;
                // Encode to Base64 (UTF-16LE) to completely bypass cmd.exe escaping issues
                const encodedCmd = Buffer.from(psScript, 'utf16le').toString('base64');
                command = `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedCmd}`;
            } else {
                command = `open tel:${dialedTarget}`;
            }

            exec(command, (error) => {
                if (error) {
                    resolve({
                        success: false,
                        message: `I encountered an error trying to dial ${contactName}, Sir.`
                    });
                } else {
                    const addMsg = !phoneNumber && !isDirectNumber
                        ? ` I couldn't find ${contactName} in your synced Android contacts, but I am routing the name to your phone dialer as a fallback.`
                        : '';

                    resolve({
                        success: true,
                        message: `Establishing secure connection. Auto-dialing ${contactName} now via Phone Link.${addMsg}`
                    });
                }
            });
        });
    }
};

export default plugin;
