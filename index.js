require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// --- IMPORT BACKGROUND JOBS ---
const startAutoCekOngkir = require('./jobs/autoCekOngkir');

// --- SISTEM PEMBACA COMMAND ---
const commands = new Map();
const commandsPath = path.join(__dirname, 'commands'); // Sesuaikan kalau lu pakai 'command' (tanpa s)

if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    commands.set(command.name, command); 
}

async function connectToWhatsApp() {
    try {
        console.log('=== Memulai Bot WhatsApp ===');
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false, 
            logger: pino({ level: 'silent' })
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) qrcode.generate(qr, { small: true });

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
                if (shouldReconnect) connectToWhatsApp();
            } else if (connection === 'open') {
                console.log(`Mantap! Bot WA udah nyala. Ada ${commands.size} command dimuat 🚀`);
                
                // JALANKAN BACKGROUND JOBS DI SINI
                startAutoCekOngkir(sock);
            }
        });

        sock.ev.on('messages.upsert', async m => {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (!textMessage) return;

            // Ambil pesan, ubah jadi huruf kecil, dan hilangkan spasi berlebih
            const textLower = textMessage.toLowerCase().trim();
            const args = textLower.split(/ +/); 
            const commandName = args.shift(); 

            // Cek apakah commandName ada di Map
            if (commands.has(commandName)) {
                try {
                    await commands.get(commandName).execute(sock, msg, args);
                } catch (error) {
                    console.error(`Error saat menjalankan command ${commandName}:`, error);
                    await sock.sendMessage(msg.key.remoteJid, { text: 'Waduh, ada error pas jalanin command ini.' });
                }
            } else {
                // --- FALLBACK: JIKA COMMAND SALAH / TIDAK ADA ---
                let helpText = `*Command '${commandName}' tidak dikenali!*\n\n`;
                helpText += `*DAFTAR COMMAND TERSEDIA:*\n\n`;

                // Looping semua file command yang ada di Map
                commands.forEach((cmd) => {
                    helpText += `*👉 ${cmd.name}*\n`;
                    helpText += `┣ *Keterangan:* ${cmd.description || '-'}\n`;
                    // Kalau properti 'usage' nggak diisi, pakai nama command-nya aja
                    helpText += `┗ *Contoh:* ${cmd.usage || cmd.name}\n\n`; 
                });

                helpText += `_Silakan ketik salah satu contoh di atas._`;

                await sock.sendMessage(msg.key.remoteJid, { text: helpText });
            }
        });

    } catch (error) {
        console.error('Terjadi error fatal:', error);
    }
}

connectToWhatsApp();