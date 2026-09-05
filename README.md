# WhatsApp Bot dengan Dukungan MySQL

## Tentang Aplikasi
Aplikasi ini adalah bot WhatsApp yang mendukung berbagai fitur seperti AI, manajemen pengguna, dan dashboard web. Bot ini dapat menggunakan database SQLite (default) atau MySQL untuk penyimpanan data.

## Persyaratan Sistem
- Node.js v14 atau lebih tinggi
- NPM
- XAMPP (jika menggunakan MySQL)

## Instalasi

1. Clone repositori ini
2. Jalankan `npm install` untuk menginstal semua dependensi
3. Salin file `.env.example` ke `.env` dan sesuaikan konfigurasi
4. Jalankan bot dengan perintah `node index.js`

## Menggunakan MySQL dengan XAMPP

### Langkah 1: Instalasi dan Konfigurasi XAMPP
1. Unduh dan instal XAMPP dari [situs resmi](https://www.apachefriends.org/)
2. Buka panel kontrol XAMPP dan aktifkan modul Apache dan MySQL
3. Klik tombol "Admin" pada baris MySQL untuk membuka phpMyAdmin
4. Buat database baru dengan nama `whatsapp_bot`

### Langkah 2: Konfigurasi Bot untuk Menggunakan MySQL
1. Buka file `.env` dan ubah konfigurasi database:
   ```
   DATABASE_TYPE=mysql
   DATABASE_HOST=localhost
   DATABASE_USER=root
   DATABASE_PASSWORD=
   DATABASE_NAME=whatsapp_bot
   ```
   
2. Jika Anda mengubah password MySQL saat instalasi XAMPP, pastikan untuk memperbarui `DATABASE_PASSWORD` dengan password yang benar

### Langkah 3: Menjalankan Bot dengan MySQL
1. Pastikan server MySQL di XAMPP sedang berjalan
2. Jalankan bot dengan perintah `node index.js`
3. Bot akan secara otomatis membuat tabel yang diperlukan di database MySQL

## Hosting Bot di XAMPP

### Langkah 1: Pindahkan Proyek ke Folder htdocs
1. Salin seluruh folder proyek ke direktori `htdocs` di instalasi XAMPP Anda (biasanya di `C:\xampp\htdocs\`)

### Langkah 2: Buat File Startup
1. Buat file batch (misalnya `start_bot.bat`) dengan konten berikut:
   ```batch
   @echo off
   cd C:\xampp\htdocs\[nama_folder_bot]
   node index.js
   ```

2. Untuk menjalankan bot secara otomatis saat startup Windows:
   - Tekan `Win + R`, ketik `shell:startup` dan tekan Enter
   - Salin shortcut file batch yang telah dibuat ke folder startup

## Fitur
- Integrasi dengan WhatsApp
- Dashboard web untuk monitoring dan administrasi
- Dukungan AI dengan berbagai provider (OpenAI, Gemini, dll)
- Manajemen pengguna dan admin
- Pencatatan pesan dan statistik
- Dukungan untuk database SQLite dan MySQL

## Pemecahan Masalah

### Database MySQL
- Pastikan server MySQL di XAMPP berjalan sebelum menjalankan bot
- Verifikasi kredensial database di file `.env`
- Jika terjadi error koneksi, bot akan otomatis beralih ke SQLite

### Koneksi WhatsApp
- Pastikan untuk memindai kode QR saat pertama kali menjalankan bot
- Jika koneksi terputus, restart bot dan pindai ulang kode QR

## Lisensi
MIT License