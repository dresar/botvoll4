const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/bot.db');

db.all('PRAGMA table_info(members)', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Table structure for members:');
    console.log(JSON.stringify(rows, null, 2));
  }
  db.close();
});