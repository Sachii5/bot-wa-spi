/**
 * Parameter Parser & Validator untuk Command cekpb V1
 */

const { VALID_SALESMEN, STATUS_DEFINITIONS } = require('./constants');

/**
 * Validasi dan normalisasi tanggal (DD-MM-YYYY atau DD/MM/YYYY)
 * @param {string} dateStr 
 * @returns {{ valid: boolean, isoDate?: string, displayDate?: string, error?: string }}
 */
function parseDate(dateStr) {
    const match = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (!match) return { valid: false };

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) {
        return { 
            valid: false, 
            error: `Tanggal *${dateStr}* tidak valid dalam kalender. Gunakan format *DD-MM-YYYY* atau *DD/MM/YYYY* (contoh: *28-08-2026*).` 
        };
    }

    const testDate = new Date(year, month - 1, day);
    if (testDate.getFullYear() !== year || testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
        return { 
            valid: false, 
            error: `Tanggal *${dateStr}* tidak valid (misal: jumlah hari melebihi batas bulan tersebut).` 
        };
    }

    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const displayDate = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;

    return { valid: true, isoDate, displayDate };
}

/**
 * Mencari status berdasarkan teks atau alias
 * @param {string} text 
 * @returns {object|null} status definition or null
 */
function findStatus(text) {
    const normalized = text.toLowerCase().trim();
    for (const key of Object.keys(STATUS_DEFINITIONS)) {
        const def = STATUS_DEFINITIONS[key];
        if (def.aliases.includes(normalized)) {
            return def;
        }
    }
    return null;
}

/**
 * Parse argumen command cekpb menjadi Filter Object terstruktur
 * @param {string[]} args 
 * @returns {{ isValid: boolean, filter?: object, error?: string }}
 */
function parseArgs(args) {
    if (!args || args.length === 0) {
        return {
            isValid: true,
            filter: {
                salesman: null,
                status: null,
                tanggal: null,
                displayDate: new Date().toLocaleDateString('id-ID'),
                isDefaultToday: true,
                mode: 'SUMMARY_GLOBAL'
            }
        };
    }

    let remainingTokens = [...args];
    let foundDate = null;
    let foundSalesman = null;
    let foundStatus = null;

    // 1. Ekstrak Tanggal (Cari token yang sesuai pola tanggal)
    for (let i = 0; i < remainingTokens.length; i++) {
        const token = remainingTokens[i];
        if (/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.test(token)) {
            const dateResult = parseDate(token);
            if (!dateResult.valid) {
                return {
                    isValid: false,
                    error: dateResult.error || 'Format tanggal tidak valid. Gunakan format *DD-MM-YYYY* (contoh: *28-08-2026*).'
                };
            }
            if (foundDate) {
                return {
                    isValid: false,
                    error: 'Hanya diperbolehkan memasukkan satu parameter tanggal.'
                };
            }
            foundDate = dateResult;
            remainingTokens.splice(i, 1);
            break;
        }
    }

    // 2. Ekstrak Salesman (Cari token yang cocok dengan VALID_SALESMEN)
    for (let i = 0; i < remainingTokens.length; i++) {
        const token = remainingTokens[i].toUpperCase();
        if (VALID_SALESMEN.includes(token)) {
            if (foundSalesman) {
                return {
                    isValid: false,
                    error: 'Hanya diperbolehkan memasukkan satu parameter salesman.'
                };
            }
            foundSalesman = token;
            remainingTokens.splice(i, 1);
            break;
        }
    }

    // 3. Ekstrak Status (Bisa satu token atau gabungan beberapa token tersisa)
    if (remainingTokens.length > 0) {
        // Coba cocokkan seluruh sisa token yang digabung
        const joinedText = remainingTokens.join(' ');
        const statusMatch = findStatus(joinedText);

        if (statusMatch) {
            foundStatus = statusMatch;
            remainingTokens = [];
        } else {
            // Coba periksa token satu per satu
            for (let i = remainingTokens.length - 1; i >= 0; i--) {
                const singleMatch = findStatus(remainingTokens[i]);
                if (singleMatch && !foundStatus) {
                    foundStatus = singleMatch;
                    remainingTokens.splice(i, 1);
                }
            }
        }
    }

    // 4. Jika masih ada sisa token yang tidak dikenali
    if (remainingTokens.length > 0) {
        const unrec = remainingTokens.join(' ');
        let errMsg = `❌ Parameter *"${unrec}"* tidak dikenali!\n\n`;
        errMsg += `*💡 PANDUAN PARAMETER CEKPB:*\n`;
        errMsg += `┣ *Salesman:* ${VALID_SALESMEN.join(', ')}\n`;
        errMsg += `┣ *Status:* sendhh, picking, packing, draft, bayar, siapstruk, selesai, batal\n`;
        errMsg += `┣ *Tanggal:* DD-MM-YYYY (contoh: 28-08-2026)\n\n`;
        errMsg += `*Contoh Penggunaan:*\n`;
        errMsg += `• *cekpb* (Rekap hari ini)\n`;
        errMsg += `• *cekpb ABD*\n`;
        errMsg += `• *cekpb selesai*\n`;
        errMsg += `• *cekpb 28-08-2026*\n`;
        errMsg += `• *cekpb ABD selesai 28-08-2026*`;

        return {
            isValid: false,
            error: errMsg
        };
    }

    // 5. Tentukan Mode Tampilan Output Sesuai Spesifikasi PRD
    const filterCount = (foundSalesman ? 1 : 0) + (foundStatus ? 1 : 0) + (foundDate ? 1 : 0);
    let mode = 'SUMMARY_GLOBAL';

    if (filterCount >= 2 || (foundSalesman && foundDate) || (foundStatus && foundDate)) {
        // Kombinasi filter -> Mode Detail List
        mode = 'DETAIL_LIST';
    } else if (foundSalesman && !foundStatus && !foundDate) {
        // Hanya Salesman -> Mode Rekap Salesman
        mode = 'SUMMARY_SALESMAN';
    } else if (foundStatus && !foundSalesman && !foundDate) {
        // Hanya Status -> Mode Rekap Status
        mode = 'SUMMARY_STATUS';
    } else if (foundDate && !foundSalesman && !foundStatus) {
        // Hanya Tanggal -> Mode Rekap Tanggal Global
        mode = 'SUMMARY_GLOBAL';
    }

    return {
        isValid: true,
        filter: {
            salesman: foundSalesman,
            status: foundStatus,
            tanggal: foundDate ? foundDate.isoDate : null,
            displayDate: foundDate ? foundDate.displayDate : new Date().toLocaleDateString('id-ID'),
            isDefaultToday: !foundDate,
            mode
        }
    };
}

module.exports = {
    parseArgs,
    parseDate,
    findStatus
};
