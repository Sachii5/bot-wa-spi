const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'deljob',
    description: 'Menghapus chat ini dari target notifikasi ongkir otomatis',
    usage: 'deljob',
    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const jidsPath = path.join(__dirname, '..', 'jids.json');
        
        if (!fs.existsSync(jidsPath)) {
            await sock.sendMessage(jid, { text: '❌ Belum ada JID yang terdaftar sama sekali.' });
            return;
        }

        let targetJids = JSON.parse(fs.readFileSync(jidsPath, 'utf-8'));

        if (targetJids.includes(jid)) {
            // Filter / buang JID ini dari array
            targetJids = targetJids.filter(id => id !== jid);
            fs.writeFileSync(jidsPath, JSON.stringify(targetJids, null, 2));
            await sock.sendMessage(jid, { text: '🗑️ Sip! Nomor/Grup ini udah dihapus dan nggak akan nerima notifikasi otomatis lagi.' });
        } else {
            await sock.sendMessage(jid, { text: '❌ Nomor/Grup ini emang belum terdaftar bos.' });
        }
    }
};