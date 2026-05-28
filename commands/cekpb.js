const pool = require('../db'); 

module.exports = {
    name: 'cekpb',
    description: 'Cek rekapitulasi PB harian',
    usage: 'cekpb', // <-- TAMBAHAN BARU
    async execute(sock, msg, args) {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Sedang memproses rekap data PB hari ini...' });

        try {
            const querySql = `
                select 
                    count(o.obi_nopb) filter (where o.obi_recid is null or o.obi_recid not like 'B%') as jml_pb_not_b,
                    count(o.obi_nopb) filter (where o.obi_recid like 'B%') as jml_pb_b,
                    count(o.obi_nopb) filter (where c.cus_nosalesman = 'DND' and (o.obi_recid is null or o.obi_recid not like 'B%')) as dnd,
                    count(o.obi_nopb) filter (where c.cus_nosalesman = 'FRL' and (o.obi_recid is null or o.obi_recid not like 'B%')) as frl,
                    count(o.obi_nopb) filter (where c.cus_nosalesman = 'DPT' and (o.obi_recid is null or o.obi_recid not like 'B%')) as dpt,
                    count(o.obi_nopb) filter (where c.cus_nosalesman = 'LID' and (o.obi_recid is null or o.obi_recid not like 'B%')) as lid
                from tbtr_obi_h o
                join tbmaster_customer c on c.cus_kodemember = o.obi_kdmember
                where o.obi_tgltrans >= current_date
                  and o.obi_tgltrans < current_date + interval '1 day';
            `;
            
            const res = await pool.query(querySql);
            const data = res.rows[0];

            let reply = `*📊 REKAP PB HARIAN*\n`;
            reply += `*(Tanggal: ${new Date().toLocaleDateString('id-ID')})*\n\n`;
            reply += `┣ *Total PB:* ${data.jml_pb_not_b}\n`;
            reply += `┣ *Total PB Batal:* ${data.jml_pb_b}\n\n`;
            reply += `*Detail per Salesman:*\n`;
            reply += `┣ *DND:* ${data.dnd}\n`;
            reply += `┣ *FRL:* ${data.frl}\n`;
            reply += `┣ *DPT:* ${data.dpt}\n`;
            reply += `┗ *LID:* ${data.lid}`;

            await sock.sendMessage(msg.key.remoteJid, { text: reply });

        } catch (dbError) {
            console.error('Error saat query cekpb:', dbError);
            await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal mengambil data rekap PB.' });
        }
    }
};