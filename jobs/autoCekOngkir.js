const pool = require('../db'); 
const fs = require('fs');
const path = require('path');

function startAutoCekOngkir(sock) {
    const intervalTime = 60 * 1000; // 1 menit

    setInterval(async () => {
        try {
            // --- 1. AMBIL DAFTAR JID ---
            const jidsPath = path.join(__dirname, '..', 'jids.json');
            
            // Kalau file jids.json belum ada atau isinya kosong, skip pengecekan db
            if (!fs.existsSync(jidsPath)) return;
            const targetJids = JSON.parse(fs.readFileSync(jidsPath, 'utf-8'));
            if (targetJids.length === 0) return;

            console.log('⏳ [JOB] Menjalankan pengecekan ongkir otomatis...');
            
            // --- 2. CEK DATABASE ---
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

            if (res.rows.length > 0) {
                let replyMessage = '*🚨 NOTIFIKASI ONGKIR OTOMATIS 🚨*\n\n';
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

                // --- 3. KIRIM KE SEMUA TARGET ---
                // Looping semua nomor/grup yang udah kedaftar di jids.json
                for (const jid of targetJids) {
                    await sock.sendMessage(jid, { text: replyMessage });
                    console.log(`✅ [JOB] Berhasil mengirim pesan otomatis ke ${jid}.`);
                }
                
            } else {
                console.log('ℹ️ [JOB] Tidak ada data ongkir baru, skip kirim pesan.');
            }

        } catch (error) {
            console.error('❌ [JOB] Error saat auto cekongkir:', error);
        }
    }, intervalTime);
}

module.exports = startAutoCekOngkir;