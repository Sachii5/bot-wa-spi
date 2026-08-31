/**
 * Konstanta dan Konfigurasi Bisnis untuk Command cekpb V1
 */

// 1. Daftar Salesman Resmi
const VALID_SALESMEN = ['ABD', 'DRI', 'FRH', 'HRS', 'SAL', 'WAY'];

// 2. Definisi Status Bisnis dan Pemetaan ke kolom obi_recid
const STATUS_DEFINITIONS = {
    sendhh: {
        key: 'sendhh',
        label: 'Siap send HH',
        emoji: '📦',
        recidSql: 'o.obi_recid IS NULL',
        aliases: ['sendhh', 'siapsendhh', 'siap send hh', 'siap-send-hh', 'send hh', 'null']
    },
    picking: {
        key: 'picking',
        label: 'Siap picking',
        emoji: '📦',
        recidSql: "o.obi_recid = '1'",
        aliases: ['picking', 'siap picking', 'siappicking', 'siap-picking', '1']
    },
    packing: {
        key: 'packing',
        label: 'Siap packing',
        emoji: '📦',
        recidSql: "o.obi_recid = '2'",
        aliases: ['packing', 'siap packing', 'siappacking', 'siap-packing', '2']
    },
    draft: {
        key: 'draft',
        label: 'Siap draft struk',
        emoji: '📝',
        recidSql: "o.obi_recid = '3'",
        aliases: ['draft', 'draft struk', 'draftstruk', 'siap draft struk', 'siapdraftstruk', '3', 'dsp']
    },
    bayar: {
        key: 'bayar',
        label: 'Konfirmasi pembayaran',
        emoji: '💳',
        recidSql: "o.obi_recid = '4'",
        aliases: ['bayar', 'konfirmasi', 'konfirmasi pembayaran', 'konfirmasipembayaran', 'pembayaran', '4']
    },
    siapstruk: {
        key: 'siapstruk',
        label: 'Siap struk',
        emoji: '🧾',
        recidSql: "o.obi_recid = '5'",
        aliases: ['siapstruk', 'siap struk', 'siap-struk', '5']
    },
    selesai: {
        key: 'selesai',
        label: 'Selesai struk',
        emoji: '✅',
        recidSql: "o.obi_recid = '6'",
        aliases: ['selesai', 'selesai struk', 'selesaistruk', 'selesai-struk', '6']
    },
    batal: {
        key: 'batal',
        label: 'Batal',
        emoji: '❌',
        recidSql: "o.obi_recid LIKE 'B%'",
        aliases: ['batal', 'cancel', 'b']
    }
};

/**
 * Helper untuk mendapatkan label status dari nilai mentah obi_recid
 * @param {string|null} recid 
 * @returns {string}
 */
function getStatusLabelByRecid(recid) {
    if (recid === null || recid === undefined || recid === '') {
        return 'Siap send HH';
    }
    const r = String(recid).trim();
    if (r === '1') return 'Siap picking';
    if (r === '2') return 'Siap packing';
    if (r === '3') return 'Siap draft struk';
    if (r === '4') return 'Konfirmasi pembayaran';
    if (r === '5') return 'Siap struk';
    if (r === '6') return 'Selesai struk';
    if (r.toUpperCase().startsWith('B')) return `Batal (${r})`;
    return `Status (${r})`;
}

// 3. Batas Maksimal Baris Tampilan Detail di WhatsApp
const MAX_DETAIL_ROWS = 15;

module.exports = {
    VALID_SALESMEN,
    STATUS_DEFINITIONS,
    getStatusLabelByRecid,
    MAX_DETAIL_ROWS
};
