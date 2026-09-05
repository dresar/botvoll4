const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2');
const CONFIG = require('../config');

class MemberManager {
  constructor(db) {
    this.db = db;
    this.init();
  }
  
  async init() {
    await this.createMemberTable();
  }

  async createMemberTable() {
    return new Promise((resolve, reject) => {
      // Gunakan SQL yang berbeda berdasarkan jenis database
      const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
      
      // Definisikan SQL untuk membuat tabel member
      const memberTableSQL = isMysql ?
        `CREATE TABLE IF NOT EXISTS members (
          id INT AUTO_INCREMENT PRIMARY KEY,
          phone VARCHAR(20) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100),
          status VARCHAR(20) DEFAULT 'pending', /* pending, approved, rejected */
          join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          approved_date DATETIME,
          approved_by VARCHAR(50),
          notes TEXT,
          is_active BOOLEAN DEFAULT 1,
          membership_type VARCHAR(20) DEFAULT 'regular', /* regular, silver, gold, platinum, unlimited */
          membership_expires DATETIME,
          credits INT DEFAULT 10,
          last_message_date DATETIME
        )` :
        `CREATE TABLE IF NOT EXISTS members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          status TEXT DEFAULT 'pending', /* pending, approved, rejected */
          join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          approved_date DATETIME,
          approved_by TEXT,
          notes TEXT,
          is_active BOOLEAN DEFAULT 1,
          membership_type TEXT DEFAULT 'regular', /* regular, silver, gold, platinum, unlimited */
          membership_expires DATETIME,
          credits INTEGER DEFAULT 10,
          last_message_date DATETIME
        )`;
      
      // Eksekusi SQL berdasarkan jenis database
      if (isMysql) {
        // MySQL menggunakan query() untuk eksekusi SQL
        this.db.query(memberTableSQL, (err) => {
          if (err) {
            console.error('MySQL member table creation error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        // SQLite menggunakan run() untuk eksekusi SQL
        this.db.run(memberTableSQL, (err) => {
          if (err) {
            console.error('SQLite member table creation error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  }

  async getMembers(status = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM members WHERE is_active = 1';
      const params = [];
      
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY join_date DESC';
      
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  
  async getMemberById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM members WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  
  async getMemberByPhone(phone) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM members WHERE phone = ?', [phone], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  
  async addMember(member) {
    return new Promise((resolve, reject) => {
      const { 
        phone, 
        name, 
        email, 
        notes, 
        last_message_date,
        status = 'approved',
        membership_type = 'free'
      } = member;
      
      const now = new Date().toISOString();
      const messageDate = last_message_date || now;
      
      // Buat query dinamis berdasarkan field yang ada
      const fields = ['phone', 'name', 'email', 'notes', 'join_date', 'status', 'membership_type'];
      const values = [phone, name, email, notes, now, status, membership_type];
      
      // Tambahkan field opsional jika disediakan
      if (messageDate) {
        fields.push('last_message_date');
        values.push(messageDate);
      }
      
      // Jika status approved, tambahkan approved_date
      if (status === 'approved') {
        fields.push('approved_date');
        values.push(now);
      }
      
      const placeholders = values.map(() => '?').join(', ');
      const query = `INSERT INTO members (${fields.join(', ')}) VALUES (${placeholders})`;
      
      this.db.run(query, values, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  }
  
  async updateMember(id, member) {
    return new Promise((resolve, reject) => {
      // Extract all possible fields from member object
      const { 
        phone, 
        name, 
        email, 
        notes, 
        status, 
        membership_type, 
        membership_expires, 
        credits, 
        last_message_date 
      } = member;
      
      // Build dynamic query based on provided fields
      let setFields = [];
      let params = [];
      
      // Add fields that are provided
      if (phone !== undefined) { setFields.push('phone = ?'); params.push(phone); }
      if (name !== undefined) { setFields.push('name = ?'); params.push(name); }
      if (email !== undefined) { setFields.push('email = ?'); params.push(email); }
      if (notes !== undefined) { setFields.push('notes = ?'); params.push(notes); }
      if (status !== undefined) { setFields.push('status = ?'); params.push(status); }
      if (membership_type !== undefined) { setFields.push('membership_type = ?'); params.push(membership_type); }
      if (membership_expires !== undefined) { setFields.push('membership_expires = ?'); params.push(membership_expires); }
      if (credits !== undefined) { setFields.push('credits = ?'); params.push(credits); }
      if (last_message_date !== undefined) { setFields.push('last_message_date = ?'); params.push(last_message_date); }
      
      // Add ID to params
      params.push(id);
      
      // If no fields to update, return
      if (setFields.length === 0) {
        return resolve({ changes: 0 });
      }
      
      // Create and execute query
      const query = `UPDATE members SET ${setFields.join(', ')} WHERE id = ?`;
      
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
  
  async approveMember(id, approvedBy) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      this.db.run(
        'UPDATE members SET status = ?, approved_date = ?, approved_by = ? WHERE id = ?',
        ['approved', now, approvedBy, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
  
  async rejectMember(id, approvedBy) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      this.db.run(
        'UPDATE members SET status = ?, approved_date = ?, approved_by = ? WHERE id = ?',
        ['rejected', now, approvedBy, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
  
  async deleteMember(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM members WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
  
  async getPendingMembersCount() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) as count FROM members WHERE status = ?', ['pending'], (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      });
    });
  }
  
  async updateMembershipType(id, membershipType, expiryDate = null) {
    return new Promise((resolve, reject) => {
      let query, params;
      
      if (expiryDate) {
        query = 'UPDATE members SET membership_type = ?, membership_expires = ? WHERE id = ?';
        params = [membershipType, expiryDate, id];
      } else {
        query = 'UPDATE members SET membership_type = ?, membership_expires = NULL WHERE id = ?';
        params = [membershipType, id];
      }
      
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
  
  async updateCredits(id, credits) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE members SET credits = ? WHERE id = ?',
        [credits, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
  
  async addCredits(id, amount) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE members SET credits = credits + ? WHERE id = ?',
        [amount, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
  
  async updateLastMessageDate(id) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      this.db.run(
        'UPDATE members SET last_message_date = ? WHERE id = ?',
        [now, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
  
  async getMembersByMembershipType(type) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM members WHERE membership_type = ? AND is_active = 1 ORDER BY join_date DESC',
        [type],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
  
  async getExpiredMemberships() {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      this.db.all(
        'SELECT * FROM members WHERE membership_expires < ? AND membership_type != "regular" AND is_active = 1',
        [now],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = MemberManager;