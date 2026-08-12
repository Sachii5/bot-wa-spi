require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
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
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`Menggunakan WA v${version.join('.')}, isLatest: ${isLatest}`);
        
        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false, 
            logger: pino({ level: 'error' })
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            console.log('STATUS KONEKSI BERUBAH:', update); // <- Tambahan log untuk debug
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) qrcode.generate(qr, { small: true });

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
                
                console.error('Alasan terputus:', lastDisconnect?.error?.message || lastDisconnect?.error || 'Tidak ada info error');
                
                if (shouldReconnect) {
                    console.log('Koneksi terputus, mencoba menghubungkan ulang dalam 3 detik...');
                    setTimeout(connectToWhatsApp, 3000);
                }
            } else if (connection === 'open') {
                console.log(`Mantap! Bot WA udah nyala. Ada ${commands.size} command dimuat 🚀`);
                
                // JALANKAN BACKGROUND JOBS DI SINI
                startAutoCekOngkir(sock);
            }
        });

        sock.ev.on('messages.upsert', async m => {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            let textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (!textMessage) return;

            // --- CEK APAKAH DI GRUP DAN DI-TAG ---
            const isGroup = msg.key.remoteJid.endsWith('@g.us');
            
            // WhatsApp menggunakan dua format ID: nomor telepon biasa (@s.whatsapp.net) dan LID (@lid)
            const botNumber = (sock.user?.id || '').split(':')[0] + '@s.whatsapp.net';
            const botLid = sock.user?.lid ? sock.user.lid.split(':')[0] + '@lid' : '';

            if (isGroup) {
                const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                // Cek apakah ada yang me-mention bot (bisa nomor WA, bisa juga LID bot)
                const isMentioned = mentionedJid.includes(botNumber) || (botLid && mentionedJid.includes(botLid));

                // Kalau di grup tapi bot tidak di-tag, abaikan pesan
                if (!isMentioned) return; 

                // Hapus tulisan "@nomorbot" (baik format WA biasa maupun LID) dari teks supaya command terbaca bersih
                const tag1 = '@' + botNumber.split('@')[0];
                textMessage = textMessage.replace(new RegExp(tag1, 'g'), '');
                
                if (botLid) {
                    const tag2 = '@' + botLid.split('@')[0];
                    textMessage = textMessage.replace(new RegExp(tag2, 'g'), '');
                }
                textMessage = textMessage.trim();
            }

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