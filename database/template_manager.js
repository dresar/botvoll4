const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2');
const CONFIG = require('../config');

class TemplateManager {
  constructor(db) {
    this.db = db;
    this.init();
  }
  
  async init() {
    await this.createTemplateTable();
    setTimeout(() => {
      this.insertDefaultTemplates();
    }, 1000); // Tunggu 1 detik untuk memastikan tabel sudah dibuat
  }

  async createTemplateTable() {
    return new Promise((resolve, reject) => {
      // Gunakan SQL yang berbeda berdasarkan jenis database
      const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
      
      // Definisikan SQL untuk membuat tabel template pesan
      const templateTableSQL = isMysql ?
        `CREATE TABLE IF NOT EXISTS message_templates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category VARCHAR(50) NOT NULL,
          title VARCHAR(100) NOT NULL,
          content TEXT NOT NULL,
          created_by VARCHAR(50) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        )` :
        `CREATE TABLE IF NOT EXISTS message_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        )`;
      
      // Eksekusi SQL berdasarkan jenis database
      if (isMysql) {
        // MySQL menggunakan query() untuk eksekusi SQL
        this.db.query(templateTableSQL, (err) => {
          if (err) {
            console.error('MySQL template table creation error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        // SQLite menggunakan run() untuk eksekusi SQL
        this.db.run(templateTableSQL, (err) => {
          if (err) {
            console.error('SQLite template table creation error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  }

  insertDefaultTemplates() {
    // Definisikan template pesan default
    const defaultTemplates = [
      // Kategori Gombalan
      ['gombalan', 'Gombalan Klasik', 'Andai kamu adalah bintang, aku akan menjadi langit yang selalu memelukmu setiap malam.'],
      ['gombalan', 'Gombalan Manis', 'Jika cinta adalah matematika, maka kamu adalah rumus yang tak pernah bisa kupecahkan, karena semakin kupelajari semakin rumit perasaanku padamu.'],
      ['gombalan', 'Gombalan Lucu', 'Kamu tahu nggak bedanya kamu sama kopi? Kalau kopi bikin mata melek, kalau kamu bikin mata melek semalaman karena kepikiran terus.'],
      
      // Kategori Perkenalan
      ['perkenalan', 'Perkenalan Formal', 'Halo, perkenalkan nama saya [nama]. Saya berasal dari [kota]. Senang berkenalan dengan Anda.'],
      ['perkenalan', 'Perkenalan Santai', 'Hai! Aku [nama], biasa dipanggil [panggilan]. Asalku dari [kota]. Senang bisa kenalan sama kamu!'],
      ['perkenalan', 'Perkenalan Bisnis', 'Selamat [pagi/siang/sore/malam], perkenalkan saya [nama] dari [perusahaan/institusi]. Saya tertarik untuk berdiskusi tentang [topik] dengan Anda.'],
      
      // Kategori Salam
      ['salam', 'Salam Pembuka', 'Assalamualaikum Wr. Wb. / Selamat [pagi/siang/sore/malam], semoga hari Anda menyenangkan.'],
      ['salam', 'Salam Penutup', 'Terima kasih atas perhatiannya. Wassalamualaikum Wr. Wb. / Sampai jumpa kembali.'],
      ['salam', 'Salam Hari Raya', 'Selamat Hari Raya Idul Fitri, mohon maaf lahir dan batin.']
    ];
    
    // Tambahkan template default ke database
    const now = new Date().toISOString();
    const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
    
    defaultTemplates.forEach(([category, title, content]) => {
      // Cek apakah template sudah ada
      const checkSql = `SELECT id FROM message_templates WHERE category = ? AND title = ?`;
      
      this.db.get(checkSql, [category, title], (err, row) => {
        if (err) {
          console.error('Error checking template existence:', err);
          return;
        }
        
        // Jika template belum ada, tambahkan
        if (!row) {
          const insertSql = `INSERT INTO message_templates 
                          (category, title, content, created_by, created_at, updated_at, is_active) 
                          VALUES (?, ?, ?, 'system', ?, ?, 1)`;
          
          this.db.run(insertSql, [category, title, content, now, now], (err) => {
            if (err) console.error('Error inserting default template:', err);
          });
        }
      });
    });
  }

  async getMessageTemplates(category = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM message_templates WHERE is_active = 1';
      const params = [];
      
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      
      query += ' ORDER BY category, title';
      
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  
  async getMessageTemplateById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM message_templates WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  
  async addMessageTemplate(template) {
    return new Promise((resolve, reject) => {
      const { category, title, content, created_by } = template;
      const now = new Date().toISOString();
      
      this.db.run(
        'INSERT INTO message_templates (category, title, content, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [category, title, content, created_by, now, now],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }
  
  async updateMessageTemplate(id, template) {
    return new Promise((resolve, reject) => {
      const { category, title, content } = template;
      const now = new Date().toISOString();
      
      this.db.run(
        'UPDATE message_templates SET category = ?, title = ?, content = ?, updated_at = ? WHERE id = ?',
        [category, title, content, now, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
  
  async deleteMessageTemplate(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM message_templates WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
}

module.exports = TemplateManager;