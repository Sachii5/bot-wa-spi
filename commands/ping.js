const pool = require('../db'); 

module.exports = {
    name: 'ping',
    description: 'Cek status bot',
    usage: 'ping', // <-- TAMBAHAN BARU
    async execute(sock, msg, args) {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Pong! Bot aktif bos 🔥' });
    }
};