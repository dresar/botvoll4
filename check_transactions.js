const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Buka koneksi ke database
const dbPath = path.join(__dirname, 'database', 'bot.db');
console.log(`Memeriksa database di: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error membuka database:', err.message);
    process.exit(1);
  }
  console.log('Terhubung ke database SQLite.');
});

// Periksa tabel yang ada
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Error memeriksa tabel:', err.message);
    process.exit(1);
  }
  
  console.log('\nTabel dalam database:');
  tables.forEach(table => console.log(`- ${table.name}`));
  
  // Periksa apakah tabel transactions ada
  const transactionsTable = tables.find(t => t.name === 'transactions');
  
  if (transactionsTable) {
    // Periksa data dalam tabel transactions
    db.all("SELECT * FROM transactions", [], (err, rows) => {
      if (err) {
        console.error('Error memeriksa data transaksi:', err.message);
        db.close();
        process.exit(1);
      }
      
      console.log('\nData transaksi:');
      if (rows.length === 0) {
        console.log('Tidak ada data transaksi yang tersimpan.');
      } else {
        console.log(`Jumlah transaksi: ${rows.length}`);
        console.log('\nDetail transaksi:');
        rows.forEach(row => {
          console.log(`\nID: ${row.id}`);
          console.log(`Member ID: ${row.member_id}`);
          console.log(`Paket: ${row.package_type}`);
          console.log(`Durasi: ${row.duration}`);
          console.log(`Jumlah: ${row.amount}`);
          console.log(`Status: ${row.status}`);
          console.log(`Tanggal Transaksi: ${row.transaction_date}`);
        });
      }
      
      // Tutup koneksi database
      db.close(() => {
        console.log('\nKoneksi database ditutup.');
      });
    });
  } else {
    console.log('\nTabel transactions belum dibuat.');
    db.close(() => {
      console.log('Koneksi database ditutup.');
    });
  }
});