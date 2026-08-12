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
                    c.cus_nosalesman,
                    count(o.obi_nopb) filter (where o.obi_recid is null or o.obi_recid not like 'B%') as jml_pb_not_b,
                    count(o.obi_nopb) filter (where o.obi_recid like 'B%') as jml_pb_b
                from tbtr_obi_h o
                join tbmaster_customer c on c.cus_kodemember = o.obi_kdmember
                where o.obi_tgltrans >= current_date
                  and o.obi_tgltrans < current_date + interval '1 day'
                group by c.cus_nosalesman
                order by c.cus_nosalesman;
            `;
            
            const res = await pool.query(querySql);

            let totalPb = 0;
            let totalPbBatal = 0;
            let detailSalesman = '';

            for (const row of res.rows) {
                const pbNotB = parseInt(row.jml_pb_not_b) || 0;
                const pbB = parseInt(row.jml_pb_b) || 0;
                
                totalPb += pbNotB;
                totalPbBatal += pbB;

                const salesman = row.cus_nosalesman || 'UNDEFINED';
                detailSalesman += `┣ *${salesman}:* ${pbNotB}\n`;
            }

            // Ganti ┣ terakhir menjadi ┗ agar rapi
            if (detailSalesman.length > 0) {
                detailSalesman = detailSalesman.slice(0, -1); // Hapus \n terakhir
                const lastIdx = detailSalesman.lastIndexOf('┣');
                if (lastIdx !== -1) {
                    detailSalesman = detailSalesman.substring(0, lastIdx) + '┗' + detailSalesman.substring(lastIdx + 1);
                }
            } else {
                detailSalesman = '┗ (Belum ada transaksi hari ini)';
            }

            let reply = `*📊 REKAP PB HARIAN*\n`;
            reply += `*(Tanggal: ${new Date().toLocaleDateString('id-ID')})*\n\n`;
            reply += `┣ *Total PB:* ${totalPb}\n`;
            reply += `┣ *Total PB Batal:* ${totalPbBatal}\n\n`;
            reply += `*Detail per Salesman:*\n`;
            reply += detailSalesman;

            await sock.sendMessage(msg.key.remoteJid, { text: reply });

        } catch (dbError) {
            console.error('Error saat query cekpb:', dbError);
            await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal mengambil data rekap PB.' });
        }
    }
};