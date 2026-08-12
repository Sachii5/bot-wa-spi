const pool = require('../db'); 

module.exports = {
    name: 'cekstok',
    description: 'Cek stok barang (karton & pcs)',
    usage: 'cekstok indomie / cekstok 1666510', // <-- TAMBAHAN BARU
    async execute(sock, msg, args) {
        const keyword = args.join(' ');

        if (!keyword) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: 'Masukkan PLU atau Nama produknya bos!\n\nContoh:\n*cekstok 12345*\n*cekstok indomie*' 
            });
            return;
        }

        await sock.sendMessage(msg.key.remoteJid, { text: `🔍 Sedang mencari stok untuk: *${keyword}*...` });

        try {
            // Kita tarik prd_frac dari database buat dihitung di JS
            const querySql = `
                select
                    prd_deskripsipanjang as "nama_produk",
                    prd_prdcd as "PLU",
                    st_saldoakhir as "STOCK",
                    prd_frac as "FRAC"
                from tbmaster_stock
                left join tbmaster_prodmast on st_prdcd = prd_prdcd
                where prd_recordid is null 
                  and (st_prdcd ILIKE $1 or prd_deskripsipanjang ILIKE $1)
                  and st_lokasi = '01'
                limit 15;
            `;
            
            const queryValues = [`%${keyword}%`];
            const res = await pool.query(querySql, queryValues);

            if (res.rows.length === 0) {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Data stok untuk *${keyword}* tidak ditemukan.` });
                return;
            }

            let replyMessage = `*📦 HASIL CEK STOK: ${keyword.toUpperCase()}*\n\n`;
            
            res.rows.forEach((row, index) => {
                // Konversi data ke angka bulat
                const stokPcs = parseInt(row.STOCK) || 0;
                const frac = parseInt(row.FRAC) || 1; // Antisipasi pembagian nol kalau data db kosong
                
                // Cari total karton (dibulatkan ke bawah) dan sisa pcs
                const ctn = Math.trunc(stokPcs / frac);
                const sisaPcs = stokPcs % frac;

                // Rangkai teks "X CTN Y PCS"
                let textCtnPcs = '';
                if (ctn !== 0) textCtnPcs += `${ctn} CTN `;
                if (sisaPcs !== 0 || ctn === 0) textCtnPcs += `${sisaPcs} PCS`;

                replyMessage += `*${index + 1}. ${row.nama_produk}*\n`;
                replyMessage += `┣ *PLU:* ${row.PLU}\n`;
                replyMessage += `┣ *Total:* ${stokPcs.toLocaleString('id-ID')} PCS\n`;
                replyMessage += `┗ *Stok:* ${textCtnPcs.trim()}\n\n`;
            });

            if (res.rows.length >= 15) {
                replyMessage += `_Data terlalu banyak, hanya menampilkan 15 teratas. Coba masukkan nama/PLU yang lebih spesifik._`;
            }

            await sock.sendMessage(msg.key.remoteJid, { text: replyMessage });

        } catch (dbError) {
            console.error('Error saat query cekstok:', dbError);
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan sistem saat mengecek stok.' });
        }
    }
};