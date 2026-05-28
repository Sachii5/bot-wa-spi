const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'addjob',
    description: 'Mendaftarkan chat ini ke target notifikasi ongkir otomatis',
    usage: 'addjob',
    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const jidsPath = path.join(__dirname, '..', 'jids.json');
        
        let targetJids = [];
        
        // Baca file json kalau udah ada
        if (fs.existsSync(jidsPath)) {
            const fileContent = fs.readFileSync(jidsPath, 'utf-8');
            if (fileContent) targetJids = JSON.parse(fileContent);
        }

        // Cek apakah JID udah terdaftar
        if (!targetJids.includes(jid)) {
            targetJids.push(jid);
            // Simpan ke jids.json
            fs.writeFileSync(jidsPath, JSON.stringify(targetJids, null, 2));
            await sock.sendMessage(jid, { text: '✅ Mantap! Nomor/Grup ini berhasil didaftarkan untuk menerima notifikasi ongkir otomatis.' });
        } else {
            await sock.sendMessage(jid, { text: '⚠️ Nomor/Grup ini udah terdaftar sebelumnya bos.' });
        }
    }
};