/**
 * Output Formatter untuk WhatsApp Command cekpb V1
 */

const { getStatusLabelByRecid } = require('./constants');

/**
 * Format string box drawing agar elemen terakhir menggunakan ┗
 * @param {string[]} lines 
 * @returns {string}
 */
function formatTreeList(lines) {
    if (!lines || lines.length === 0) return '┗ (Tidak ada data)\n';
    return lines.map((line, idx) => {
        const isLast = idx === lines.length - 1;
        const prefix = isLast ? '┗ ' : '┣ ';
        return prefix + line;
    }).join('\n');
}

/**
 * Format Rekap Keseluruhan (Global / Tanggal)
 * @param {any[]} rows 
 * @param {object} filter 
 * @returns {string}
 */
function formatSummaryGlobal(rows, filter) {
    if (!rows || rows.length === 0) {
        return formatNoData(filter);
    }

    let grandTotal = 0;
    let totalSendHh = 0;
    let totalPicking = 0;
    let totalPacking = 0;
    let totalDraft = 0;
    let totalBayar = 0;
    let totalSiapStruk = 0;
    let totalSelesai = 0;
    let totalBatal = 0;

    const salesmanLines = [];

    for (const row of rows) {
        const total = parseInt(row.total_pb, 10) || 0;
        const sendHh = parseInt(row.jml_sendhh, 10) || 0;
        const picking = parseInt(row.jml_picking, 10) || 0;
        const packing = parseInt(row.jml_packing, 10) || 0;
        const draft = parseInt(row.jml_draft, 10) || 0;
        const bayar = parseInt(row.jml_bayar, 10) || 0;
        const siapStruk = parseInt(row.jml_siapstruk, 10) || 0;
        const selesai = parseInt(row.jml_selesai, 10) || 0;
        const batal = parseInt(row.jml_batal, 10) || 0;

        grandTotal += total;
        totalSendHh += sendHh;
        totalPicking += picking;
        totalPacking += packing;
        totalDraft += draft;
        totalBayar += bayar;
        totalSiapStruk += siapStruk;
        totalSelesai += selesai;
        totalBatal += batal;

        const sls = row.cus_nosalesman || 'UNDEFINED';
        salesmanLines.push(`*${sls}:* ${total}`);
    }

    let reply = `*📊 REKAP PB HARIAN*\n`;
    reply += `*(Tanggal: ${filter.displayDate})*\n\n`;

    const statusTree = [
        `*Total Seluruh PB:* ${grandTotal}`,
        `📦 *Siap send HH:* ${totalSendHh}`,
        `📦 *Siap picking:* ${totalPicking}`,
        `📦 *Siap packing:* ${totalPacking}`,
        `📝 *Siap draft struk:* ${totalDraft}`,
        `💳 *Konfirmasi bayar:* ${totalBayar}`,
        `🧾 *Siap struk:* ${totalSiapStruk}`,
        `✅ *Selesai struk:* ${totalSelesai}`,
        `❌ *Batal:* ${totalBatal}`
    ];
    reply += formatTreeList(statusTree) + '\n\n';

    reply += `*Detail per Salesman:*\n`;
    reply += formatTreeList(salesmanLines);

    return reply;
}

/**
 * Format Rekap Spesifik Salesman
 * @param {any[]} rows 
 * @param {object} filter 
 * @returns {string}
 */
function formatSummarySalesman(rows, filter) {
    if (!rows || rows.length === 0) {
        return formatNoData(filter);
    }

    const row = rows[0] || {};
    const total = parseInt(row.total_pb, 10) || 0;
    const sendHh = parseInt(row.jml_sendhh, 10) || 0;
    const picking = parseInt(row.jml_picking, 10) || 0;
    const packing = parseInt(row.jml_packing, 10) || 0;
    const draft = parseInt(row.jml_draft, 10) || 0;
    const bayar = parseInt(row.jml_bayar, 10) || 0;
    const siapStruk = parseInt(row.jml_siapstruk, 10) || 0;
    const selesai = parseInt(row.jml_selesai, 10) || 0;
    const batal = parseInt(row.jml_batal, 10) || 0;

    let reply = `*📊 REKAP PB SALESMAN: ${filter.salesman}*\n`;
    reply += `*(Tanggal: ${filter.displayDate})*\n\n`;

    const statusTree = [
        `*Total PB:* ${total}`,
        `📦 *Siap send HH:* ${sendHh}`,
        `📦 *Siap picking:* ${picking}`,
        `📦 *Siap packing:* ${packing}`,
        `📝 *Siap draft struk:* ${draft}`,
        `💳 *Konfirmasi bayar:* ${bayar}`,
        `🧾 *Siap struk:* ${siapStruk}`,
        `✅ *Selesai struk:* ${selesai}`,
        `❌ *Batal:* ${batal}`
    ];
    reply += formatTreeList(statusTree);

    return reply;
}

/**
 * Format Rekap Spesifik Status
 * @param {any[]} rows 
 * @param {object} filter 
 * @returns {string}
 */
function formatSummaryStatus(rows, filter) {
    if (!rows || rows.length === 0) {
        return formatNoData(filter);
    }

    let grandTotal = 0;
    const salesmanLines = [];

    for (const row of rows) {
        const total = parseInt(row.total_pb, 10) || 0;
        grandTotal += total;
        const sls = row.cus_nosalesman || 'UNDEFINED';
        salesmanLines.push(`*${sls}:* ${total}`);
    }

    let reply = `*📊 REKAP PB STATUS: ${filter.status.label.toUpperCase()}*\n`;
    reply += `*(Tanggal: ${filter.displayDate})*\n\n`;
    reply += `┣ *Status:* ${filter.status.emoji} ${filter.status.label}\n`;
    reply += `┗ *Total PB:* ${grandTotal}\n\n`;

    reply += `*Rincian per Salesman:*\n`;
    reply += formatTreeList(salesmanLines);

    return reply;
}

/**
 * Format Daftar Detail Transaksi PB
 * @param {{ totalCount: number, rows: any[] }} result 
 * @param {object} filter 
 * @returns {string}
 */
function formatDetailList(result, filter) {
    if (!result || result.totalCount === 0 || !result.rows || result.rows.length === 0) {
        return formatNoData(filter);
    }

    // Filter Chips untuk Header
    const filterDesc = [];
    if (filter.salesman) filterDesc.push(`Salesman ${filter.salesman}`);
    if (filter.status) filterDesc.push(`Status ${filter.status.label}`);
    filterDesc.push(`Tanggal ${filter.displayDate}`);

    let reply = `*📋 DAFTAR DETAIL PB*\n`;
    reply += `*(${filterDesc.join(' | ')})*\n`;
    reply += `*Total Data:* ${result.totalCount} PB\n\n`;

    result.rows.forEach((row, index) => {
        const memberName = row.cus_namamember || 'TANPA NAMA';
        const memberCode = row.obi_kdmember || '-';
        const pbNo = row.obi_nopb || row.obi_notrans || '-';
        const salesman = row.cus_nosalesman || 'UNDEFINED';
        const statusLabel = getStatusLabelByRecid(row.obi_recid);
        const harga = Number(row.harga_ttl || 0).toLocaleString('id-ID');

        reply += `*${index + 1}. Member:* ${memberName} (${memberCode})\n`;
        reply += `┣ *No PB:* ${pbNo}\n`;
        reply += `┣ *Salesman:* ${salesman}\n`;
        reply += `┣ *Status:* ${statusLabel}\n`;
        reply += `┗ *Total:* Rp ${harga}\n\n`;
    });

    if (result.totalCount > result.rows.length) {
        reply += `_...dan ${result.totalCount - result.rows.length} data PB lainnya._`;
    }

    return reply;
}

/**
 * Format Pesan Saat Data Kosong / Tidak Ditemukan
 * @param {object} filter 
 * @returns {string}
 */
function formatNoData(filter) {
    let reply = `*ℹ️ DATA PB TIDAK DITEMUKAN*\n\n`;
    reply += `Tidak ada data transaksi PB untuk filter berikut:\n`;
    if (filter.salesman) reply += `┣ *Salesman:* ${filter.salesman}\n`;
    if (filter.status) reply += `┣ *Status:* ${filter.status.label}\n`;
    reply += `┗ *Tanggal:* ${filter.displayDate}\n\n`;
    reply += `_Silakan periksa kembali kriteria pencarian atau pilih tanggal lain._`;
    return reply;
}

/**
 * Router utama untuk memilih formatter yang tepat sesuai filter mode
 * @param {object} filter 
 * @param {any} data 
 * @returns {string}
 */
function formatResult(filter, data) {
    switch (filter.mode) {
        case 'SUMMARY_SALESMAN':
            return formatSummarySalesman(data, filter);
        case 'SUMMARY_STATUS':
            return formatSummaryStatus(data, filter);
        case 'DETAIL_LIST':
            return formatDetailList(data, filter);
        case 'SUMMARY_GLOBAL':
        default:
            return formatSummaryGlobal(data, filter);
    }
}

module.exports = {
    formatResult,
    formatSummaryGlobal,
    formatSummarySalesman,
    formatSummaryStatus,
    formatDetailList,
    formatNoData
};
