module.exports = {
    name: 'cekid',
    description: 'Cek JID untuk target otomatis',
    usage: 'cekid',
    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const tipeChat = jid.endsWith('@g.us') ? 'Grup' : 'Personal';

        let balasan = `*🔍 INFO JID CHAT INI*\n\n`;
        balasan += `Tipe Chat: ${tipeChat}\n`;
        balasan += `JID:\n*${jid}*\n\n`;
        balasan += `💡 *TIPS:*\nKetik *addjob* di chat ini untuk menjadikan nomor/grup ini sebagai penerima otomatis notifikasi ongkir.\n`;
        balasan += `Ketik *deljob* untuk berhenti menerima notifikasi.`;

        await sock.sendMessage(jid, { text: balasan });
    }
};