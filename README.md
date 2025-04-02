# TEA Airdrop Script

Proyek ini adalah skrip untuk mengirimkan 0.01 TEA ke beberapa alamat Ethereum. Anda dapat memilih untuk menghasilkan alamat secara acak atau menggunakan daftar alamat yang Anda miliki sendiri.

## Fitur

- Menghasilkan alamat Ethereum secara acak.
- Mengirimkan 0.01 TEA ke setiap alamat.
- Memungkinkan pengguna untuk memasukkan daftar alamat secara manual.

## Persyaratan

- Node.js (pastikan versi terbaru sudah terpasang).
- Private key Anda sendiri yang disimpan di file `.env`.

## Instalasi

Ikuti langkah-langkah berikut untuk menginstal dan menjalankan skrip:

### 1. Clone Repositori

Clone repositori ini ke komputer lokal Anda:

```bash
git clone https://github.com/yogiprayoga1313/Tea-auto.git

cd repository-name

npm install

- Buat file .env di root folder proyek dan masukkan private key Anda:

PRIVATE_KEY=your_private_key_here

- Jalankan skrip dengan perintah berikut:

node index.js
