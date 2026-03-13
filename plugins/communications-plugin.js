import nodemailer from 'nodemailer';
import open from 'open';

const plugin = {
    name: 'Communications',
    version: '1.1.0',
    description: 'Handles Email (SMTP) and WhatsApp (URI) communication.',

    // Store transporter instance
    transporter: null,

    async initialize() {
        console.log('[COMMUNICATIONS] Plugin initialized');

        // validate creds existence
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('[COMMUNICATIONS] ⚠️ Email credentials missing in .env');
            return;
        }

        // Initialize and verify transporter with VERBOSE LOGGING
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // Use SSL
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            debug: true, // Show debug output
            logger: true // Log information to console
        });

        // Verify connection in background
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('[COMMUNICATIONS] ❌ SMTP Connection Failed:', error.message);
                if (error.code === 'EAUTH') {
                    console.error('[COMMUNICATIONS] 💡 Hint: For Gmail, use an "App Password", not your login password.');
                }
            } else {
                console.log('[COMMUNICATIONS] ✅ SMTP Server is ready to take messages');
            }
        });
    },

    canHandle(intent, userInput) {
        return /(email|mail|send.*email|test.*email|whatsapp|message|text.*whatsapp)/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        try {
            const input = userInput.toLowerCase();

            // === WHATSAPP ===
            if (input.includes('whatsapp')) {
                const msgMatch = input.match(/saying (.+)/i) || input.match(/message (.+)/i);
                const message = msgMatch ? encodeURIComponent(msgMatch[1]) : '';

                const phoneMatch = input.match(/(\d{10,})/);
                const phone = phoneMatch ? phoneMatch[1] : '';

                const url = `whatsapp://send?phone=${phone}&text=${message}`;
                await open(url);
                return { success: true, message: "Opening WhatsApp with your message." };
            }

            // === EMAIL ===
            if (input.includes('email') || input.includes('mail')) {
                // Check creds
                if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
                    return {
                        success: false,
                        message: "I need your email credentials. Please check the server console or .env file."
                    };
                }

                // TEST COMMAND
                if (input.includes('test connection') || input.includes('debug')) {
                    try {
                        await this.transporter.verify();
                        return { success: true, message: "SMTP Connection Verified. Credentials are correct." };
                    } catch (err) {
                        return { success: false, message: `Connection Failed: ${err.message}` };
                    }
                }

                if (input.includes('test email')) {
                    await this.sendEmail(process.env.EMAIL_USER, "Test From SENTINAL", "If you are reading this, the email module is fully operational.");
                    return { success: true, message: `Test email sent to ${process.env.EMAIL_USER}.` };
                }

                // PARSE INTENT
                const toMatch = input.match(/to\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i);
                if (!toMatch) {
                    return { success: false, message: "Please specify a recipient email address." };
                }

                const subjectMatch = input.match(/subject\s+(.+?)\s+(body|saying|message)/i);
                const bodyMatch = input.match(/(body|saying|message)\s+(.+)/i);

                const to = toMatch[1];
                const subject = subjectMatch ? subjectMatch[1] : "Message from SENTINAL";
                const body = bodyMatch ? bodyMatch[2] : "Sent from SENTINAL.";

                await this.sendEmail(to, subject, body);
                return { success: true, message: `Email sent to ${to}.` };
            }

            return { success: false, message: "I'm not sure how to send that message." };

        } catch (error) {
            console.error('[COMMUNICATIONS] Error:', error);
            return { success: false, message: `Communication failed: ${error.message}` };
        }
    },

    async sendEmail(to, subject, text) {
        if (!this.transporter) {
            throw new Error("Transporter not initialized. Check credentials.");
        }
        await this.transporter.sendMail({
            from: `"SENTINAL" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text
        });
    }
};

export default plugin;
