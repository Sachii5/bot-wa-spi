# WhatsApp Bot (Node.js & Baileys)

Bot WhatsApp sederhana yang dibangun menggunakan Node.js dan pustaka [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys). Proyek ini juga terintegrasi dengan database PostgreSQL.

## Fitur Utama
- Terhubung dengan WhatsApp secara langsung (melalui pemindaian QR code di terminal).
- Integrasi dengan database PostgreSQL.
- Struktur proyek berbasis modul (`commands/` dan `jobs/`).

## Prasyarat
Sebelum menjalankan proyek ini, pastikan Anda telah menginstal:
- [Node.js](https://nodejs.org/) (Versi terbaru atau LTS direkomendasikan)
- [PostgreSQL](https://www.postgresql.org/) (Untuk koneksi database pada `db.js`)

## Cara Instalasi & Menjalankan Bot

1. **Clone repositori ini atau buka di direktori Anda.**
2. **Instal seluruh dependensi (libraries)**:
   ```bash
   npm install
   ```
3. **Konfigurasi Environment**:
   Buat file bernama `.env` di folder utama (root) proyek dan isi dengan konfigurasi database atau API keys yang dibutuhkan proyek (tergantung dari implementasi di file `db.js` atau `index.js`).

4. **Konfigurasi `jids.json` (PENTING)**:
   > [!IMPORTANT]
   > Anda harus membuat file konfigurasi bernama `jids.json` di folder utama proyek (sejajar dengan `index.js`).
   > File ini digunakan untuk menyimpan daftar JID (ID WhatsApp pengguna atau grup) yang akan berinteraksi dengan bot. File ini tidak disimpan di version control (diabaikan oleh git).
   
   Contoh isi `jids.json`:
   ```json
   [
     "1234567890@s.whatsapp.net",
     "120363000000000000@g.us"
   ]
   ```

5. **Jalankan Bot**:
   Buka terminal/CMD dan jalankan:
   ```bash
   node index.js
   ```
6. **Scan QR Code**:
   Jika ini adalah pertama kalinya Anda menjalankan bot, sebuah QR code akan muncul di terminal. Buka aplikasi WhatsApp di HP Anda -> Perangkat Tertaut -> Tautkan Perangkat, lalu scan QR code tersebut. Session akan otomatis disimpan di folder `auth_info_baileys/`.

## Struktur Folder & File
- `index.js` - Titik masuk utama aplikasi bot.
- `db.js` - File konfigurasi dan koneksi ke PostgreSQL.
- `commands/` - Kumpulan perintah (commands) yang bisa dieksekusi oleh bot.
- `jobs/` - Skrip atau fungsi yang mungkin dijalankan secara berkala (cron/scheduler).
- `auth_info_baileys/` - Menyimpan status sesi bot agar tidak perlu memindai kode QR berulang kali (Jangan bagikan isinya).
- `jids.json` - File list WhatsApp ID.

---
*Dibuat menggunakan Baileys*
