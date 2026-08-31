const { parseArgs } = require('./cekpb_modules/parser');
const { fetchSummaryData, fetchDetailData } = require('./cekpb_modules/queryService');
const { formatResult } = require('./cekpb_modules/formatter');

module.exports = {
    name: 'cekpb',
    description: 'Cek rekapitulasi dan detail PB harian atau filter dinamis',
    usage: 'cekpb [salesman] [status] [tanggal] (Contoh: cekpb ABD selesai 28-08-2026)',
    async execute(sock, msg, args) {
        // 1. Parse & Validasi Parameter Input
        const parseResult = parseArgs(args);
        if (!parseResult.isValid) {
            await sock.sendMessage(msg.key.remoteJid, { text: parseResult.error });
            return;
        }

        const filter = parseResult.filter;

        // 2. Beri indikator proses ke WhatsApp
        let waitText = '⏳ Sedang memproses data PB';
        if (filter.salesman) waitText += ` (Salesman: ${filter.salesman})`;
        if (filter.status) waitText += ` (Status: ${filter.status.label})`;
        waitText += ` [${filter.displayDate}]...`;

        await sock.sendMessage(msg.key.remoteJid, { text: waitText });

        try {
            // 3. Eksekusi query database sesuai mode
            let dbData;
            if (filter.mode === 'DETAIL_LIST') {
                dbData = await fetchDetailData(filter);
            } else {
                dbData = await fetchSummaryData(filter);
            }

            // 4. Format hasil query ke teks WhatsApp yang informatif & rapi
            const replyMessage = formatResult(filter, dbData);

            // 5. Kirim pesan balasan
            await sock.sendMessage(msg.key.remoteJid, { text: replyMessage });

        } catch (dbError) {
            console.error('Error saat query cekpb:', dbError);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Terjadi kesalahan sistem saat mengambil data PB. Silakan coba beberapa saat lagi.' 
            });
        }
    }
};