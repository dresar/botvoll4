const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/bot.db');

// Menambahkan kolom yang hilang ke tabel members
db.serialize(() => {
  // Menambahkan kolom membership_type
  db.run('ALTER TABLE members ADD COLUMN membership_type TEXT DEFAULT "regular"', (err) => {
    if (err) {
      console.error('Error adding membership_type column:', err);
    } else {
      console.log('Successfully added membership_type column');
    }
  });

  // Menambahkan kolom membership_expires
  db.run('ALTER TABLE members ADD COLUMN membership_expires DATETIME', (err) => {
    if (err) {
      console.error('Error adding membership_expires column:', err);
    } else {
      console.log('Successfully added membership_expires column');
    }
  });

  // Menambahkan kolom credits
  db.run('ALTER TABLE members ADD COLUMN credits INTEGER DEFAULT 10', (err) => {
    if (err) {
      console.error('Error adding credits column:', err);
    } else {
      console.log('Successfully added credits column');
    }
  });

  // Menambahkan kolom last_message_date
  db.run('ALTER TABLE members ADD COLUMN last_message_date DATETIME', (err) => {
    if (err) {
      console.error('Error adding last_message_date column:', err);
    } else {
      console.log('Successfully added last_message_date column');
    }
    db.close();
  });
});