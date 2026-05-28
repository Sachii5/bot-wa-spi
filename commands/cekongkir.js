const pool = require('../db'); 

module.exports = {
    name: 'cekongkir',
    description: 'Cek pb yang terkena ongir',
    usage: 'cekongkir', // <-- TAMBAHAN BARU
    async execute(sock, msg, args) {
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang mengecek data ke database...' });

        try {
            const querySql = `
                select 
                    h.obi_kdmember, 
                    c.cus_namamember,
                    h.obi_nopb, 
                    h.obi_ekspedisi, 
                    c.cus_jarak,
                    h.obi_ttlorder + h.obi_ttlppn - h.obi_ttldiskon as harga_ttl
                from tbtr_obi_h h
                join tbtr_obi_d d on d.obi_tgltrans = h.obi_tgltrans and d.obi_notrans = h.obi_notrans
                join tbmaster_customer c on h.obi_kdmember = cus_kodemember 
                where h.obi_ekspedisi <> '0' 
                and h.obi_recid is null;
            `;
            
            const res = await pool.query(querySql);

            if (res.rows.length === 0) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Data ongkir tidak ditemukan.' });
                return;
            }

            let replyMessage = '*📦 HASIL CEK ONGKIR*\n\n';
            const dataToLoop = res.rows.slice(0, 10); 
            
            dataToLoop.forEach((row, index) => {
                replyMessage += `*${index + 1}. Member:* ${row.cus_namamember} (${row.obi_kdmember})\n`;
                replyMessage += `┣ *No PB:* ${row.obi_nopb}\n`;
                replyMessage += `┣ *Ekspedisi:* ${row.obi_ekspedisi}\n`;
                replyMessage += `┣ *Jarak:* ${row.cus_jarak} km\n`;
                replyMessage += `┗ *Total:* Rp ${Number(row.harga_ttl).toLocaleString('id-ID')}\n\n`;
            });

            if (res.rows.length > 10) {
                replyMessage += `_...dan ${res.rows.length - 10} data lainnya._`;
            }

            await sock.sendMessage(msg.key.remoteJid, { text: replyMessage });

        } catch (dbError) {
            console.error('Error saat query database:', dbError);
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan sistem saat mengambil data.' });
        }
    }
};