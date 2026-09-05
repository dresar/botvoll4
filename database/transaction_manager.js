const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2');
const CONFIG = require('../config');

class TransactionManager {
  constructor(db) {
    this.db = db;
    this.init();
  }
  
  async init() {
    await this.createTransactionTable();
  }

  async createTransactionTable() {
    return new Promise((resolve, reject) => {
      // Gunakan SQL yang berbeda berdasarkan jenis database
      const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
      
      // Definisikan SQL untuk membuat tabel transaksi
      const transactionTableSQL = isMysql ?
        `CREATE TABLE IF NOT EXISTS transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          member_id INT NOT NULL,
          package_type VARCHAR(20) NOT NULL, /* basic, premium, platinum, unlimited */
          duration VARCHAR(10) NOT NULL, /* 1m, 3m, 6m, 1y */
          amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          payment_proof TEXT,
          status VARCHAR(20) DEFAULT 'pending', /* pending, approved, rejected */
          transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          approved_date DATETIME,
          approved_by VARCHAR(50),
          notes TEXT,
          FOREIGN KEY (member_id) REFERENCES members(id)
        )` :
        `CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          member_id INTEGER NOT NULL,
          package_type TEXT NOT NULL, /* basic, premium, platinum, unlimited */
          duration TEXT NOT NULL, /* 1m, 3m, 6m, 1y */
          amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          payment_proof TEXT,
          status TEXT DEFAULT 'pending', /* pending, approved, rejected */
          transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          approved_date DATETIME,
          approved_by TEXT,
          notes TEXT,
          FOREIGN KEY (member_id) REFERENCES members(id)
        )`;
      
      // Eksekusi SQL berdasarkan jenis database
      if (isMysql) {
        // MySQL menggunakan query() untuk eksekusi SQL
        this.db.query(transactionTableSQL, (err) => {
          if (err) {
            console.error('MySQL transaction table creation error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        // SQLite menggunakan run() untuk eksekusi SQL
        this.db.run(transactionTableSQL, (err) => {
          if (err) {
            console.error('SQLite transaction table creation error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  }

  async createTransaction(transaction) {
    return new Promise((resolve, reject) => {
      const { 
        member_id, 
        package_type, 
        duration, 
        amount, 
        payment_method,
        payment_proof = null,
        notes = null
      } = transaction;
      
      const now = new Date().toISOString();
      
      // Buat query dinamis berdasarkan field yang ada
      const fields = ['member_id', 'package_type', 'duration', 'amount', 'payment_method', 'transaction_date'];
      const values = [member_id, package_type, duration, amount, payment_method, now];
      
      // Tambahkan field opsional jika disediakan
      if (payment_proof) {
        fields.push('payment_proof');
        values.push(payment_proof);
      }
      
      if (notes) {
        fields.push('notes');
        values.push(notes);
      }
      
      const placeholders = values.map(() => '?').join(', ');
      const query = `INSERT INTO transactions (${fields.join(', ')}) VALUES (${placeholders})`;
      
      this.db.run(query, values, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  }
  
  async getTransactionById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM transactions WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  
  async getTransactionsByMemberId(memberId) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM transactions WHERE member_id = ? ORDER BY transaction_date DESC', [memberId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  
  async getPendingTransactions() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT t.*, m.phone, m.name FROM transactions t JOIN members m ON t.member_id = m.id WHERE t.status = ? ORDER BY t.transaction_date DESC', ['pending'], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  
  async approveTransaction(id, approvedBy) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      this.db.run(
        'UPDATE transactions SET status = ?, approved_date = ?, approved_by = ? WHERE id = ?',
        ['approved', now, approvedBy, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
  
  async rejectTransaction(id, approvedBy, notes = null) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      let query = 'UPDATE transactions SET status = ?, approved_date = ?, approved_by = ?';
      let params = ['rejected', now, approvedBy];
      
      if (notes) {
        query += ', notes = ?';
        params.push(notes);
      }
      
      query += ' WHERE id = ?';
      params.push(id);
      
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
  
  async updateTransactionPaymentProof(id, paymentProof) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE transactions SET payment_proof = ? WHERE id = ?',
        [paymentProof, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
  
  async getTransactionStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_amount
        FROM transactions`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
}

module.exports = TransactionManager;