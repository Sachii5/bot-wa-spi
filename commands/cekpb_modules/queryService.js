/**
 * Dynamic Parameterized Query Service untuk Command cekpb V1
 */

const pool = require('../../db');
const { MAX_DETAIL_ROWS, SALESMAN_CACHE_TTL_MS } = require('./constants');

// --- In-Memory Cache untuk Daftar Salesman Dinamis ---
let cachedSalesmen = [];
let cacheExpiry = 0;

/**
 * Mengambil daftar kode salesman aktif dari tbmaster_customer yang sesuai dengan cabang IGR di tbtr_obi_h
 * @param {boolean} forceRefresh 
 * @returns {Promise<string[]>}
 */
async function getActiveSalesmen(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedSalesmen.length > 0 && now < cacheExpiry) {
        return cachedSalesmen;
    }

    try {
        const querySql = `
            SELECT DISTINCT TRIM(c.cus_nosalesman) AS salesman
            FROM tbmaster_customer c
            WHERE c.cus_nosalesman IS NOT NULL 
              AND TRIM(c.cus_nosalesman) <> ''
              AND c.cus_kodeigr IN (
                  SELECT DISTINCT obi_kodeigr 
                  FROM tbtr_obi_h 
                  WHERE obi_kodeigr IS NOT NULL
              )
            ORDER BY salesman;
        `;
        const res = await pool.query(querySql);
        const list = res.rows
            .map(r => (r.salesman ? String(r.salesman).trim().toUpperCase() : ''))
            .filter(Boolean);

        cachedSalesmen = list;
        cacheExpiry = now + SALESMAN_CACHE_TTL_MS;
        return cachedSalesmen;
    } catch (err) {
        console.error('Error saat mengambil daftar salesman aktif dari database:', err);
        return cachedSalesmen;
    }
}

/**
 * Membangun klausa WHERE dan parameter array dari filter object
 * @param {object} filter 
 * @returns {{ whereClause: string, params: any[] }}
 */
function buildWhereClause(filter) {
    const conditions = [];
    const params = [];

    // Filter Tanggal
    if (filter.tanggal) {
        params.push(filter.tanggal);
        conditions.push(`o.obi_tgltrans >= $${params.length}::date AND o.obi_tgltrans < $${params.length}::date + interval '1 day'`);
    } else {
        conditions.push(`o.obi_tgltrans >= current_date AND o.obi_tgltrans < current_date + interval '1 day'`);
    }

    // Filter Salesman
    if (filter.salesman) {
        params.push(filter.salesman);
        conditions.push(`c.cus_nosalesman = $${params.length}`);
    }

    // Filter Status (Menggunakan SQL kondisi aman dari constants)
    if (filter.status && filter.status.recidSql) {
        conditions.push(filter.status.recidSql);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
}

/**
 * Mengambil data agregasi/rekap PB (dengan relasi cus_kodeigr = obi_kodeigr)
 * @param {object} filter 
 * @returns {Promise<any[]>}
 */
async function fetchSummaryData(filter) {
    const { whereClause, params } = buildWhereClause(filter);

    const querySql = `
        SELECT 
            c.cus_nosalesman,
            count(o.obi_nopb) as total_pb,
            count(o.obi_nopb) filter (where o.obi_recid is null) as jml_sendhh,
            count(o.obi_nopb) filter (where o.obi_recid = '1') as jml_picking,
            count(o.obi_nopb) filter (where o.obi_recid = '2') as jml_packing,
            count(o.obi_nopb) filter (where o.obi_recid = '3') as jml_draft,
            count(o.obi_nopb) filter (where o.obi_recid = '4') as jml_bayar,
            count(o.obi_nopb) filter (where o.obi_recid = '5') as jml_siapstruk,
            count(o.obi_nopb) filter (where o.obi_recid = '6') as jml_selesai,
            count(o.obi_nopb) filter (where o.obi_recid like 'B%') as jml_batal
        FROM tbtr_obi_h o
        JOIN tbmaster_customer c 
          ON c.cus_kodemember = o.obi_kdmember 
         AND c.cus_kodeigr = o.obi_kodeigr
        ${whereClause}
        GROUP BY c.cus_nosalesman
        ORDER BY c.cus_nosalesman;
    `;

    const res = await pool.query(querySql, params);
    return res.rows;
}

/**
 * Mengambil data detail daftar transaksi PB (dengan relasi cus_kodeigr = obi_kodeigr)
 * @param {object} filter 
 * @param {number} limit 
 * @returns {Promise<{ totalCount: number, rows: any[] }>}
 */
async function fetchDetailData(filter, limit = MAX_DETAIL_ROWS) {
    const { whereClause, params } = buildWhereClause(filter);

    // 1. Query Total Count
    const countSql = `
        SELECT count(o.obi_nopb) as total_count
        FROM tbtr_obi_h o
        JOIN tbmaster_customer c 
          ON c.cus_kodemember = o.obi_kdmember 
         AND c.cus_kodeigr = o.obi_kodeigr
        ${whereClause};
    `;
    const countRes = await pool.query(countSql, params);
    const totalCount = parseInt(countRes.rows[0]?.total_count || 0, 10);

    if (totalCount === 0) {
        return { totalCount: 0, rows: [] };
    }

    // 2. Query Detail Baris (dengan Limit)
    const detailParams = [...params];
    detailParams.push(limit);
    const limitIndex = detailParams.length;

    const detailSql = `
        SELECT 
            o.obi_nopb,
            o.obi_notrans,
            o.obi_tgltrans,
            o.obi_recid,
            o.obi_kdmember,
            c.cus_namamember,
            c.cus_nosalesman,
            (coalesce(o.obi_ttlorder, 0) + coalesce(o.obi_ttlppn, 0) - coalesce(o.obi_ttldiskon, 0)) as harga_ttl
        FROM tbtr_obi_h o
        JOIN tbmaster_customer c 
          ON c.cus_kodemember = o.obi_kdmember 
         AND c.cus_kodeigr = o.obi_kodeigr
        ${whereClause}
        ORDER BY o.obi_tgltrans DESC, o.obi_nopb DESC
        LIMIT $${limitIndex};
    `;

    const detailRes = await pool.query(detailSql, detailParams);
    return { totalCount, rows: detailRes.rows };
}

module.exports = {
    getActiveSalesmen,
    buildWhereClause,
    fetchSummaryData,
    fetchDetailData
};
