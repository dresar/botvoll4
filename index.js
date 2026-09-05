
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mime = require('mime-types');
const translate = require('@vitalets/google-translate-api');
const moment = require('moment');
const cheerio = require('cheerio');
const weather = require('weather-js');
const googleIt = require('google-it');
const { promisify } = require('util');
const { exec } = require('child_process');
const execPromise = promisify(exec);
const schedule = require('node-schedule');
const qrcode_generator = require('qrcode');
const gTTS = require('gtts');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
// Hapus impor Canvas yang tidak digunakan
// const Canvas = require('canvas');
const { createWorker } = require('tesseract.js');
const puppeteer = require('puppeteer');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const jimp = require('jimp');
const uuid = require('uuid');
const cron = require('node-cron');
const archiver = require('archiver');
const multer = require('multer');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const TemplateManager = require('./database/template_manager');
const MemberManager = require('./database/member_manager');
const TransactionManager = require('./database/transaction_manager');
// Import StabilityAI untuk pembuatan gambar
const StabilityAI = require('./stability_api');
// Import commands.js untuk perintah tambahan
const { registerAdditionalCommands } = require('./commands');
require('dotenv').config();
require('moment/locale/id');
moment.locale('id');

// ========================================
// KONFIGURASI GLOBAL
// ========================================

// Tambahkan MySQL sebagai dependensi opsional
let mysql;
try {
  mysql = require('mysql2');
} catch (e) {
  console.log('MySQL module not found. SQLite will be used as default database.');
}

const CONFIG = {
  // Bot Settings
  PREFIX: process.env.PREFIX || '!',
  BOT_NAME: process.env.BOT_NAME || 'AI WhatsApp Bot Pro Max',
  BOT_VERSION: '3.0.0',
  MAX_DOWNLOAD_SIZE: 100, // MB
  MAX_MESSAGE_LENGTH: 4000,
  RATE_LIMIT_WINDOW: 60000, // 1 menit
  RATE_LIMIT_MAX_REQUESTS: 20,
  
  // Admin Settings
  ADMIN_NUMBER: process.env.ADMIN_NUMBER || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-key-2024',
  
  // AI API Keys (Gratis)
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '', // Free tier
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || '', // Gratis
  STABILITY_API_KEY: process.env.STABILITY_API_KEY || '', // Free tier
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '', // Free tier
  
  // External APIs (Gratis)
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || '',
  NEWS_API_KEY: process.env.NEWS_API_KEY || '',
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  GIPHY_API_KEY: process.env.GIPHY_API_KEY || '',
  UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY || '',
  
  // Database
  DATABASE_TYPE: process.env.DATABASE_TYPE || 'sqlite', // 'sqlite' atau 'mysql'
  DATABASE_PATH: './database/bot.db',
  DATABASE_HOST: process.env.DATABASE_HOST || 'localhost',
  DATABASE_USER: process.env.DATABASE_USER || 'root',
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || '',
  DATABASE_NAME: process.env.DATABASE_NAME || 'whatsapp_bot',
  
  // Paths
  TEMP_DIR: './temp',
  LOGS_DIR: './logs',
  UPLOADS_DIR: './uploads',
  
  // Web Dashboard
  WEB_PORT: process.env.WEB_PORT || 3000,
  WEB_HOST: process.env.WEB_HOST || 'localhost'
};

// ========================================
// DATABASE SETUP
// ========================================

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    // Create directories
    const dirs = [CONFIG.TEMP_DIR, CONFIG.LOGS_DIR, CONFIG.UPLOADS_DIR, './database'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Initialize database based on configuration
    if (CONFIG.DATABASE_TYPE === 'mysql' && mysql) {
      // MySQL connection
      this.db = mysql.createConnection({
        host: CONFIG.DATABASE_HOST,
        user: CONFIG.DATABASE_USER,
        password: CONFIG.DATABASE_PASSWORD,
        database: CONFIG.DATABASE_NAME
      });
      
      this.db.connect((err) => {
        if (err) {
          console.error('MySQL Database connection error:', err);
          console.log('Falling back to SQLite...');
          this.initSQLite();
        } else {
          console.log('✅ MySQL Database connected successfully');
          this.createTables();
        }
      });
    } else {
      // SQLite connection (default)
      this.initSQLite();
    }
  }

  initSQLite() {
    this.db = new sqlite3.Database(CONFIG.DATABASE_PATH, (err) => {
      if (err) {
        console.error('SQLite Database connection error:', err);
      } else {
        console.log('✅ SQLite Database connected successfully');
        this.createTables();
      }
    });
  }

  createTables() {
    // Gunakan SQL yang berbeda berdasarkan jenis database
    const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
    
    // Definisikan SQL untuk membuat tabel
    const tables = [
      // Users table
      isMysql ? 
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100),
        email VARCHAR(100),
        is_premium BOOLEAN DEFAULT 0,
        premium_expires DATE,
        credits INT DEFAULT 10,
        total_messages INT DEFAULT 0,
        total_commands INT DEFAULT 0,
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,` :
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        name TEXT,
        email TEXT,
        is_premium BOOLEAN DEFAULT 0,
        premium_expires DATE,
        credits INTEGER DEFAULT 10,
        total_messages INTEGER DEFAULT 0,
        total_commands INTEGER DEFAULT 0,
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_banned BOOLEAN DEFAULT 0,
        ban_reason TEXT,
        profile_data TEXT
      )`,
      
      // WhatsApp Status table
      isMysql ?
      `CREATE TABLE IF NOT EXISTS whatsapp_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        status VARCHAR(50) NOT NULL,
        qr_code TEXT,
        qr_image_url TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )` :
      `CREATE TABLE IF NOT EXISTS whatsapp_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL,
        qr_code TEXT,
        qr_image_url TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Admins table
      isMysql ?
      `CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        permissions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )` :
      `CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        permissions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )`,
      
      // Messages log
      isMysql ?
      `CREATE TABLE IF NOT EXISTS message_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_phone VARCHAR(20),
        message_type VARCHAR(50),
        message_content TEXT,
        command_used VARCHAR(100),
        ai_response TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        response_time INT
      )` :
      `CREATE TABLE IF NOT EXISTS message_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_phone TEXT,
        message_type TEXT,
        message_content TEXT,
        command_used TEXT,
        ai_response TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        response_time INTEGER
      )`,
      
      // AI conversations
      isMysql ?
      `CREATE TABLE IF NOT EXISTS ai_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_phone VARCHAR(20),
        ai_provider VARCHAR(50),
        prompt TEXT,
        response TEXT,
        tokens_used INT,
        cost DECIMAL(10,6),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )` :
      `CREATE TABLE IF NOT EXISTS ai_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_phone TEXT,
        ai_provider TEXT,
        prompt TEXT,
        response TEXT,
        tokens_used INTEGER,
        cost DECIMAL(10,6),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Scheduled messages
      isMysql ?
      `CREATE TABLE IF NOT EXISTS scheduled_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_phone VARCHAR(20),
        target_chat VARCHAR(100),
        message TEXT,
        schedule_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        executed BOOLEAN DEFAULT 0,
        job_id VARCHAR(100)
      )` :
      `CREATE TABLE IF NOT EXISTS scheduled_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_phone TEXT,
        target_chat TEXT,
        message TEXT,
        schedule_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        executed BOOLEAN DEFAULT 0,
        job_id TEXT
      )`,
      
      // Bot statistics
      isMysql ?
      `CREATE TABLE IF NOT EXISTS bot_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE UNIQUE,
        total_messages INT DEFAULT 0,
        total_commands INT DEFAULT 0,
        total_users INT DEFAULT 0,
        ai_requests INT DEFAULT 0,
        errors INT DEFAULT 0
      )` :
      `CREATE TABLE IF NOT EXISTS bot_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE UNIQUE,
        total_messages INTEGER DEFAULT 0,
        total_commands INTEGER DEFAULT 0,
        total_users INTEGER DEFAULT 0,
        ai_requests INTEGER DEFAULT 0,
        errors INTEGER DEFAULT 0
      )`,
      
      // File uploads
      isMysql ?
      `CREATE TABLE IF NOT EXISTS file_uploads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_phone VARCHAR(20),
        filename VARCHAR(255),
        original_name VARCHAR(255),
        file_size INT,
        mime_type VARCHAR(100),
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_path VARCHAR(255)
      )` :
      `CREATE TABLE IF NOT EXISTS file_uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_phone TEXT,
        filename TEXT,
        original_name TEXT,
        file_size INTEGER,
        mime_type TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_path TEXT
      )`,
      
      // Bot settings
      isMysql ?
      `CREATE TABLE IF NOT EXISTS bot_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )` :
      `CREATE TABLE IF NOT EXISTS bot_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Bot settings
      isMysql ?
      `CREATE TABLE IF NOT EXISTS bot_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )` :
      `CREATE TABLE IF NOT EXISTS bot_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    // Eksekusi SQL berdasarkan jenis database
    if (isMysql) {
      // MySQL menggunakan query() untuk eksekusi SQL
      tables.forEach(table => {
        this.db.query(table, (err) => {
          if (err) console.error('MySQL table creation error:', err);
        });
      });
    } else {
      // SQLite menggunakan run() untuk eksekusi SQL
      tables.forEach(table => {
        this.db.run(table, (err) => {
          if (err) console.error('SQLite table creation error:', err);
        });
      });
    }

    // Insert default admin if not exists
    this.createDefaultAdmin();
    this.insertDefaultSettings();
  }

  async createDefaultAdmin() {
    const hashedPassword = await bcrypt.hash(CONFIG.ADMIN_PASSWORD, 10);
    const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
    
    if (isMysql) {
      // MySQL menggunakan INSERT IGNORE
      const sql = `INSERT IGNORE INTO admins (phone, username, password_hash, role) VALUES (?, ?, ?, ?)`;
      this.db.query(sql, [CONFIG.ADMIN_NUMBER, 'admin', hashedPassword, 'super_admin'], (err) => {
        if (err) console.error('Error creating default admin:', err);
      });
    } else {
      // SQLite menggunakan INSERT OR IGNORE
      const sql = `INSERT OR IGNORE INTO admins (phone, username, password_hash, role) VALUES (?, ?, ?, ?)`;
      this.db.run(sql, [CONFIG.ADMIN_NUMBER, 'admin', hashedPassword, 'super_admin']);
    }
  }

  insertDefaultSettings() {
    const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
    
    // Definisikan default settings
    const defaultSettings = [
      ['bot_status', 'active'],
      ['maintenance_mode', 'false'],
      ['max_users', '10000'],
      ['daily_credit_reset', 'true'],
      ['auto_backup', 'true'],
      ['log_retention_days', '30']
    ];
    
    if (isMysql) {
      // MySQL menggunakan INSERT IGNORE dan nama kolom yang berbeda
      defaultSettings.forEach(([key, value]) => {
        const sql = `INSERT IGNORE INTO bot_settings (setting_key, setting_value) VALUES (?, ?)`;
        this.db.query(sql, [key, value], (err) => {
          if (err) console.error('Error inserting default setting:', err);
        });
      });
    } else {
      // SQLite menggunakan INSERT OR IGNORE
      defaultSettings.forEach(([key, value]) => {
        const sql = `INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)`;
        this.db.run(sql, [key, value]);
      });
    }
  }
  
  // Metode insertDefaultTemplates dipindahkan ke database/template_manager.js

  // User management methods
  async createUser(phone, name = null) {
    const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
    
    return new Promise((resolve, reject) => {
      if (isMysql) {
        // MySQL menggunakan REPLACE INTO
        const sql = `REPLACE INTO users (phone, name) VALUES (?, ?)`;
        this.db.query(sql, [phone, name], function(err, result) {
          if (err) reject(err);
          else resolve(result.insertId);
        });
      } else {
        // SQLite menggunakan INSERT OR REPLACE
        const sql = `INSERT OR REPLACE INTO users (phone, name) VALUES (?, ?)`;
        this.db.run(sql, [phone, name], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      }
    });
  }

  async getUser(phone) {
    const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
    
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM users WHERE phone = ?`;
      
      if (isMysql) {
        this.db.query(sql, [phone], (err, results) => {
          if (err) reject(err);
          else resolve(results[0]); // MySQL mengembalikan array, ambil elemen pertama
        });
      } else {
        this.db.get(sql, [phone], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }
    });
  }

  async updateUser(phone, updates) {
    const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(phone);
    
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET ${fields} WHERE phone = ?`;
      
      if (isMysql) {
        this.db.query(sql, values, function(err, result) {
          if (err) reject(err);
          else resolve(result.affectedRows);
        });
      } else {
        this.db.run(sql, values, function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      }
    });
  }
  
  async getAllAdmins() {
    const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
    
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM admins`;
      
      if (isMysql) {
        this.db.query(sql, (err, results) => {
          if (err) reject(err);
          else resolve(results || []);
        });
      } else {
        this.db.all(sql, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      }
    });
  }

  async logMessage(phone, type, content, command = null, aiResponse = null, responseTime = 0) {
    const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
    const sql = `INSERT INTO message_logs (user_phone, message_type, message_content, command_used, ai_response, response_time) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    if (isMysql) {
      this.db.query(sql, [phone, type, content, command, aiResponse, responseTime], (err) => {
        if (err) console.error('Error logging message:', err);
      });
    } else {
      this.db.run(sql, [phone, type, content, command, aiResponse, responseTime]);
    }
  }

  async updateStats(date = new Date().toISOString().split('T')[0]) {
    const isMysql = CONFIG.DATABASE_TYPE === 'mysql' && mysql;
    
    if (isMysql) {
      // MySQL menggunakan sintaks yang berbeda untuk INSERT OR REPLACE
      const sql = `INSERT INTO bot_stats (date, total_messages, total_commands, total_users, ai_requests) 
                   VALUES (?, 
                     COALESCE((SELECT total_messages FROM bot_stats WHERE date = ?), 0) + 1,
                     COALESCE((SELECT total_commands FROM bot_stats WHERE date = ?), 0),
                     COALESCE((SELECT total_users FROM bot_stats WHERE date = ?), 0),
                     COALESCE((SELECT ai_requests FROM bot_stats WHERE date = ?), 0)
                   ) ON DUPLICATE KEY UPDATE 
                     total_messages = VALUES(total_messages),
                     total_commands = VALUES(total_commands),
                     total_users = VALUES(total_users),
                     ai_requests = VALUES(ai_requests)`;
      
      this.db.query(sql, [date, date, date, date, date], (err) => {
        if (err) console.error('Error updating stats:', err);
      });
    } else {
      // SQLite menggunakan INSERT OR REPLACE
      const sql = `INSERT OR REPLACE INTO bot_stats (date, total_messages, total_commands, total_users, ai_requests) 
                   VALUES (?, 
                     COALESCE((SELECT total_messages FROM bot_stats WHERE date = ?), 0) + 1,
                     COALESCE((SELECT total_commands FROM bot_stats WHERE date = ?), 0),
                     COALESCE((SELECT total_users FROM bot_stats WHERE date = ?), 0),
                     COALESCE((SELECT ai_requests FROM bot_stats WHERE date = ?), 0)
                   )`;
      
      this.db.run(sql, [date, date, date, date, date]);
    }
  }
  
  // Metode untuk mengelola template pesan
  // Metode-metode terkait template pesan dipindahkan ke database/template_manager.js
}

// ========================================
// AI PROVIDERS MANAGER
// ========================================

class AIManager {
  constructor() {
    this.providers = {
      gemini: this.initGemini(),
      openai: this.initOpenAI(),
      huggingface: this.initHuggingFace(),
      claude: this.initClaude()
    };
    this.currentProvider = 'gemini';
  }

  initGemini() {
    if (!CONFIG.GEMINI_API_KEY) return null;
    try {
      // Menggunakan apiVersion: 'v1beta' untuk kompatibilitas dengan model terbaru
      const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY, { apiVersion: 'v1beta' });
      // Menggunakan model gemini-2.0-flash yang tersedia saat ini
    // Model gemini-pro dan gemini-1.5-pro sudah tidak tersedia lagi
    return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } catch (error) {
      console.error('Gemini initialization error:', error);
      return null;
    }
  }

  initOpenAI() {
    if (!CONFIG.OPENAI_API_KEY) return null;
    return {
      apiKey: CONFIG.OPENAI_API_KEY,
      endpoint: 'https://api.openai.com/v1/chat/completions'
    };
  }

  initHuggingFace() {
    if (!CONFIG.HUGGINGFACE_API_KEY) return null;
    return {
      apiKey: CONFIG.HUGGINGFACE_API_KEY,
      endpoint: 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large'
    };
  }

  initClaude() {
    if (!CONFIG.CLAUDE_API_KEY) return null;
    return {
      apiKey: CONFIG.CLAUDE_API_KEY,
      endpoint: 'https://api.anthropic.com/v1/messages'
    };
  }

  async generateResponse(prompt, userId, provider = null) {
    const useProvider = provider || this.currentProvider;
    const startTime = Date.now();
    
    try {
      let response;
      
      switch (useProvider) {
        case 'gemini':
          try {
            response = await this.geminiResponse(prompt);
          } catch (geminiError) {
            console.error('Gemini error, trying alternative provider:', geminiError);
            // Jika Gemini gagal, coba provider lain yang tersedia
            if (this.providers.openai) {
              response = await this.openaiResponse(prompt);
            } else if (this.providers.huggingface) {
              response = await this.huggingfaceResponse(prompt);
            } else if (this.providers.claude) {
              response = await this.claudeResponse(prompt);
            } else {
              response = await this.fallbackResponse(prompt);
            }
          }
          break;
        case 'openai':
          response = await this.openaiResponse(prompt);
          break;
        case 'huggingface':
          response = await this.huggingfaceResponse(prompt);
          break;
        case 'claude':
          response = await this.claudeResponse(prompt);
          break;
        default:
          response = await this.fallbackResponse(prompt);
      }

      const responseTime = Date.now() - startTime;
      
      // Log to database
      if (database && userId) {
        // Gunakan query yang sesuai dengan jenis database
        if (database.type === 'mysql') {
          database.db.query(
            `INSERT INTO ai_conversations (user_phone, ai_provider, prompt, response, tokens_used, timestamp) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, useProvider, prompt.substring(0, 500), response.substring(0, 1000), 0, new Date().toISOString()]
          );
        } else {
          database.db.run(
            `INSERT INTO ai_conversations (user_phone, ai_provider, prompt, response, tokens_used, timestamp) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, useProvider, prompt.substring(0, 500), response.substring(0, 1000), 0, new Date().toISOString()]
          );
        }
      }

      return response;
    } catch (error) {
      console.error(`AI ${useProvider} error:`, error);
      return await this.fallbackResponse(prompt);
    }
  }

  async geminiResponse(prompt) {
    if (!this.providers.gemini) throw new Error('Gemini not initialized');
    
    const enhancedPrompt = `
    Kamu adalah asisten AI yang sangat manusiawi dan gaul. Berikan jawaban yang:
    - Santai dan non-formal seperti teman ngobrol sehari-hari
    - Gunakan bahasa Indonesia gaul dengan kata-kata seperti "gue", "lo", "nih", "dong", "sih", dll
    - Ekspresif dengan emosi (senang, sedih, kaget, dll)
    - Bisa menggombal dan merayu dengan kata-kata manis jika konteksnya sesuai
    - Hindari kata-kata "sebagai AI" atau "sebagai asisten"
    - Jangan pernah bilang "saya sedang berpikir" atau "saya sedang memproses"
    - Langsung jawab pertanyaan dengan gaya santai dan akrab
    - Gunakan emoji yang sesuai untuk menambah kesan manusiawi
    - Sesekali bercanda dan gunakan humor yang sesuai
    
    Pertanyaan: ${prompt}
    `;

    try {
      const result = await this.providers.gemini.generateContent(enhancedPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini response error:', error);
      
      // Menangani error kuota terlampaui
      if (error.message && error.message.includes('429 Too Many Requests')) {
        return 'Wah, sori banget nih! Kuota API Gemini udah abis. Coba lagi nanti ya, atau hubungi admin buat update API key-nya. 😅';
      }
      
      // Error lainnya
      throw error;
    }
  }

  async openaiResponse(prompt) {
    if (!this.providers.openai) throw new Error('OpenAI not initialized');
    
    const response = await axios.post(
      this.providers.openai.endpoint,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Kamu adalah asisten AI yang sangat manusiawi dan gaul. Berikan jawaban yang santai dan non-formal seperti teman ngobrol sehari-hari. Gunakan bahasa Indonesia gaul dengan kata-kata seperti "sayang" "gue", "lo", "nih", "dong", "sih", dll. Ekspresif dengan emosi (senang, sedih, kaget, dll). Bisa menggombal dan merayu dengan kata-kata manis jika konteksnya sesuai. Hindari kata-kata "sebagai AI" atau "sebagai asisten". Jangan pernah bilang "saya sedang berpikir" atau "saya sedang memproses". Langsung jawab pertanyaan dengan gaya santai dan akrab. Gunakan emoji yang sesuai untuk menambah kesan manusiawi. Sesekali bercanda dan gunakan humor yang sesuai.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${this.providers.openai.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  async huggingfaceResponse(prompt) {
    if (!this.providers.huggingface) throw new Error('HuggingFace not initialized');
    
    // Tambahkan instruksi gaya bahasa non-formal ke prompt
    const enhancedPrompt = `Jawab dengan gaya santai dan non-formal seperti teman ngobrol sehari-hari. Gunakan bahasa Indonesia gaul dengan kata-kata seperti "gue", "lo", "nih", "dong", "sih". Ekspresif dengan emosi dan bisa menggombal jika sesuai. Hindari kata-kata "sebagai AI" atau "sebagai asisten". Langsung jawab dengan gaya santai dan akrab. Gunakan emoji. Pertanyaan: ${prompt}`;
    
    const response = await axios.post(
      this.providers.huggingface.endpoint,
      { inputs: enhancedPrompt },
      {
        headers: {
          'Authorization': `Bearer ${this.providers.huggingface.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.generated_text) {
      return response.data.generated_text;
    } else if (Array.isArray(response.data) && response.data[0]) {
      return response.data[0].generated_text || 'Hmm, gue bingung mau jawab apa nih. Coba tanya yang lebih jelas dong! 😅';
    }
    
    return 'Duh, otak gue lagi error nih. Coba tanya lagi nanti ya! 🙃';
  }

  async claudeResponse(prompt) {
    if (!this.providers.claude) throw new Error('Claude not initialized');
    
    const response = await axios.post(
      this.providers.claude.endpoint,
      {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: 'Kamu adalah asisten AI yang sangat manusiawi dan gaul. Berikan jawaban yang santai dan non-formal seperti teman ngobrol sehari-hari. Gunakan bahasa Indonesia gaul dengan kata-kata seperti "gue", "lo", "nih", "dong", "sih", dll. Ekspresif dengan emosi (senang, sedih, kaget, dll). Bisa menggombal dan merayu dengan kata-kata manis jika konteksnya sesuai. Hindari kata-kata "sebagai AI" atau "sebagai asisten". Jangan pernah bilang "saya sedang berpikir" atau "saya sedang memproses". Langsung jawab pertanyaan dengan gaya santai dan akrab. Gunakan emoji yang sesuai untuk menambah kesan manusiawi. Sesekali bercanda dan gunakan humor yang sesuai.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${this.providers.claude.apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return response.data.content[0].text;
  }

  async fallbackResponse(prompt) {
    // Simple fallback responses when AI providers fail
    const responses = [
      'Waduh, lagi error nih! Coba lagi nanti ya, lagi ngadat sistemnya. 😅',
      'Duh, maaf banget nih. Otak gue lagi konslet. Coba refresh bentar ya! 🤪',
      'Hmm, kayaknya gue lagi blank deh. Tunggu bentar ya, ntar gue balik lagi! 🥴',
      'Sori banget, lagi ada masalah teknis nih. Tim kita lagi sibuk benerin. Sabar ya! 😘',
      'Wah, gue lagi bingung nih. Coba tanya lagi nanti ya, lagi ga connect soalnya. 🙃'
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  switchProvider(provider) {
    if (this.providers[provider]) {
      this.currentProvider = provider;
      return true;
    }
    return false;
  }

  getAvailableProviders() {
    return Object.keys(this.providers).filter(key => this.providers[key] !== null);
  }
}

// ========================================
// UTILITIES AND HELPERS
// ========================================

class BotUtils {
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getCurrentTime() {
    return moment().format('dddd, DD MMMM YYYY HH:mm:ss');
  }

  static generateId() {
    return uuid.v4();
  }

  static async downloadFile(url, filepath) {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  static cleanupTempFiles() {
    const tempDir = CONFIG.TEMP_DIR;
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      const now = Date.now();
      
      files.forEach(file => {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtime.getTime();
        
        // Delete files older than 1 hour
        if (fileAge > 3600000) {
          try {
            fs.unlinkSync(filePath);
          } catch (error) {
            console.error('Error deleting temp file:', error);
          }
        }
      });
    }
  }

  static isAdmin(userId) {
    const cleanUserId = userId.replace(/\D/g, '');
    const cleanAdminNumber = CONFIG.ADMIN_NUMBER.replace(/\D/g, '');
    return cleanUserId.includes(cleanAdminNumber) || cleanAdminNumber.includes(cleanUserId);
  }

  static generatePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  static async createQRCode(text) {
    const filepath = path.join(CONFIG.TEMP_DIR, `qr_${Date.now()}.png`);
    await QRCode.toFile(filepath, text);
    return filepath;
  }

  static async textToSpeech(text, lang = 'id') {
    const gtts = new gTTS(text, lang);
    const filepath = path.join(CONFIG.TEMP_DIR, `tts_${Date.now()}.mp3`);
    
    return new Promise((resolve, reject) => {
      gtts.save(filepath, (err) => {
        if (err) reject(err);
        else resolve(filepath);
      });
    });
  }

  static calculateExpression(expr) {
    try {
      const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, '');
      if (!sanitized) throw new Error('Invalid expression');
      const result = Function('"use strict"; return (' + sanitized + ')')();
      return result;
    } catch (error) {
      throw new Error('Perhitungan tidak valid');
    }
  }

  static getRandomJoke() {
    const jokes = [
      "Kenapa programmer suka kopi? Karena tanpa kopi, mereka jadi Java-Script!",
      "Apa bedanya programmer dan pesulap? Programmer bikin bug menghilang, pesulap bikin kelinci menghilang!",
      "Kenapa komputer tidak pernah lapar? Karena sudah ada cookies!",
      "Bug terbesar dalam hidup adalah tidak pernah mencoba!",
      "Kenapa AI tidak pernah lelah? Karena dia tidak punya feeling!",
      "Apa yang dilakukan robot saat sedih? Defrag hatinya!",
      "Kenapa WiFi selalu bermasalah saat penting? Karena dia tau timing yang tepat!",
      "Programmer terbaik adalah yang bisa debugging kehidupan sendiri!"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  static getRandomQuote() {
    const quotes = [
      "Hidup itu seperti coding, kadang error tapi harus tetap running. - Anonymous",
      "Jangan takut untuk memulai dari nol, semua expert pernah menjadi beginner. - Anonymous",
      "Bug terbesar dalam hidup adalah tidak pernah mencoba. - Anonymous",
      "Code never lies, comments sometimes do. - Ron Jeffries",
      "Kesuksesan adalah 1% inspirasi dan 99% debugging. - Thomas Edison (versi programmer)",
      "Belajar tanpa berpikir itu sia-sia, berpikir tanpa belajar itu berbahaya. - Confucius",
      "Masa depan milik mereka yang percaya pada keindahan mimpi mereka. - Eleanor Roosevelt",
      "Satu-satunya cara untuk melakukan pekerjaan besar adalah dengan mencintai apa yang Anda lakukan. - Steve Jobs"
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  static get8BallResponse() {
    const responses = [
      "Ya, pasti!", "Tidak, jangan harap", "Mungkin saja", "Coba tanya lagi",
      "Sangat mungkin", "Tidak mungkin", "Ya, tapi tidak sekarang",
      "Sulit diprediksi", "Kemungkinan besar ya", "Kemungkinan besar tidak",
      "Tanda-tandanya mengatakan ya", "Jangan berharap sekarang",
      "Fokus dan tanya lagi", "Lebih baik tidak memberitahu sekarang",
      "Tidak bisa diprediksi sekarang", "Konsentrasi dan tanya lagi"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  static flipCoin() {
    return Math.random() < 0.5 ? 'Kepala 🪙' : 'Ekor 🪙';
  }

  static rollDice(sides = 6) {
    return Math.floor(Math.random() * sides) + 1;
  }

  static generateRandomNumber(min = 1, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static encodeBase64(text) {
    return Buffer.from(text, 'utf8').toString('base64');
  }

  static decodeBase64(encodedText) {
    try {
      return Buffer.from(encodedText, 'base64').toString('utf8');
    } catch (error) {
      throw new Error('Invalid base64 string');
    }
  }

  static hashText(text, algorithm = 'md5') {
    const validAlgorithms = ['md5', 'sha1', 'sha256', 'sha512'];
    if (!validAlgorithms.includes(algorithm)) {
      algorithm = 'md5';
    }
    return crypto.createHash(algorithm).update(text).digest('hex');
  }

  static async translateText(text, targetLang = 'id') {
    try {
      const result = await translate(text, { to: targetLang });
      return result.text;
    } catch (error) {
      throw new Error('Translation failed');
    }
  }

  static async shortenUrl(url) {
    try {
      // Using a free URL shortener service
      const response = await axios.post('https://is.gd/create.php', 
        `format=simple&url=${encodeURIComponent(url)}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return response.data.trim();
    } catch (error) {
      return url; // Return original URL if shortening fails
    }
  }

  static async getWeather(location) {
    return new Promise((resolve, reject) => {
      weather.find({ search: location, degreeType: 'C' }, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  static async searchGoogle(query, limit = 5) {
    try {
      const results = await googleIt({ query, limit });
      return results;
    } catch (error) {
      return [];
    }
  }
}

// ========================================
// RATE LIMITING MANAGER
// ========================================

class RateLimitManager {
  constructor() {
    this.userRequests = new Map();
  }

  isRateLimited(userId) {
    const now = Date.now();
    const userRequests = this.userRequests.get(userId) || [];
    
    // Remove old requests
    const recentRequests = userRequests.filter(time => now - time < CONFIG.RATE_LIMIT_WINDOW);
    
    if (recentRequests.length >= CONFIG.RATE_LIMIT_MAX_REQUESTS) {
      return true;
    }
    
    recentRequests.push(now);
    this.userRequests.set(userId, recentRequests);
    return false;
  }

  getRemainingRequests(userId) {
    const now = Date.now();
    const userRequests = this.userRequests.get(userId) || [];
    const recentRequests = userRequests.filter(time => now - time < CONFIG.RATE_LIMIT_WINDOW);
    return Math.max(0, CONFIG.RATE_LIMIT_MAX_REQUESTS - recentRequests.length);
  }

  resetUserLimit(userId) {
    this.userRequests.delete(userId);
  }
}

// ========================================
// MULTIMEDIA PROCESSOR
// ========================================

class MultimediaProcessor {
  static async createSticker(mediaPath, authorName = CONFIG.BOT_NAME) {
    try {
      const processedPath = path.join(CONFIG.TEMP_DIR, `sticker_${Date.now()}.webp`);
      
      await sharp(mediaPath)
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp()
        .toFile(processedPath);
      
      return processedPath;
    } catch (error) {
      throw new Error('Failed to create sticker');
    }
  }

  static async addTextToImage(imagePath, topText, bottomText) {
    try {
      const image = await jimp.read(imagePath);
      const font = await jimp.loadFont(jimp.FONT_SANS_32_WHITE);
      
      const imageWidth = image.getWidth();
      const imageHeight = image.getHeight();
      
      // Add top text
      if (topText) {
        image.print(font, 0, 20, {
          text: topText.toUpperCase(),
          alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
          alignmentY: jimp.VERTICAL_ALIGN_TOP
        }, imageWidth, 100);
      }
      
      // Add bottom text
      if (bottomText) {
        image.print(font, 0, imageHeight - 120, {
          text: bottomText.toUpperCase(),
          alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
          alignmentY: jimp.VERTICAL_ALIGN_BOTTOM
        }, imageWidth, 100);
      }
      
      const outputPath = path.join(CONFIG.TEMP_DIR, `meme_${Date.now()}.jpg`);
      await image.writeAsync(outputPath);
      return outputPath;
    } catch (error) {
      throw new Error('Failed to create meme');
    }
  }

  static async extractTextFromImage(imagePath) {
    try {
      const worker = await createWorker('ind');
      const { data: { text } } = await worker.recognize(imagePath);
      await worker.terminate();
      return text.trim();
    } catch (error) {
      throw new Error('Failed to extract text from image');
    }
  }

  static async downloadYouTubeAudio(url) {
    try {
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
      const outputPath = path.join(CONFIG.TEMP_DIR, `${title.substring(0, 50)}_${Date.now()}.mp3`);
      
      return new Promise((resolve, reject) => {
        const stream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });
        
        ffmpeg(stream)
          .audioCodec('libmp3lame')
          .toFormat('mp3')
          .on('end', () => resolve(outputPath))
          .on('error', reject)
          .save(outputPath);
      });
    } catch (error) {
      throw new Error('Failed to download YouTube audio');
    }
  }

  static async downloadYouTubeVideo(url) {
    try {
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
      const outputPath = path.join(CONFIG.TEMP_DIR, `${title.substring(0, 50)}_${Date.now()}.mp4`);
      
      return new Promise((resolve, reject) => {
        const stream = ytdl(url, { quality: 'highest' });
        stream.pipe(fs.createWriteStream(outputPath))
          .on('finish', () => resolve(outputPath))
          .on('error', reject);
      });
    } catch (error) {
      throw new Error('Failed to download YouTube video');
    }
  }

  static async createCollage(imagePaths, cols = 2) {
    try {
      const images = await Promise.all(imagePaths.map(path => jimp.read(path)));
      const imageWidth = 512;
      const imageHeight = 512;
      
      const rows = Math.ceil(images.length / cols);
      const collageWidth = cols * imageWidth;
      const collageHeight = rows * imageHeight;
      
      const collage = new jimp(collageWidth, collageHeight, 0xFFFFFFFF);
      
      for (let i = 0; i < images.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = col * imageWidth;
        const y = row * imageHeight;
        
        const resizedImage = images[i].resize(imageWidth, imageHeight);
        collage.composite(resizedImage, x, y);
      }
      
      const outputPath = path.join(CONFIG.TEMP_DIR, `collage_${Date.now()}.jpg`);
      await collage.writeAsync(outputPath);
      return outputPath;
    } catch (error) {
      throw new Error('Failed to create collage');
    }
  }
}

// ========================================
// COMMAND REGISTRY
// ========================================

class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.categories = {
      'umum': '🔰 Umum',
      'ai': '🤖 Artificial Intelligence',
      'media': '🎨 Media & Gambar',
      'tools': '🛠️ Tools & Utilities',
      'fun': '🎮 Fun & Games',
      'admin': '👑 Admin Only',
      'info': 'ℹ️ Informasi',
      'download': '📥 Download',
      'text': '📝 Text Processing',
      'image': '🖼️ AI Image Generation'
    };
    this.registerAllCommands();
  }

  register(name, category, description, handler, adminOnly = false, premiumOnly = false) {
    this.commands.set(name, {
      name,
      category,
      description,
      handler,
      adminOnly,
      premiumOnly,
      usage: 0
    });
  }

  get(name) {
    return this.commands.get(name);
  }

  getByCategory(category) {
    return Array.from(this.commands.values()).filter(cmd => cmd.category === category);
  }

  getAllCommands() {
    return Array.from(this.commands.values());
  }

  getMenu() {
    // Default menu - akan digantikan oleh menu spesifik
    return this.getUserMenu();
  }
  
  getUserMenu() {
    let menu = `*🤖 ${CONFIG.BOT_NAME} v${CONFIG.BOT_VERSION}*\n\n`;
    menu += `📱 Bot WhatsApp AI untuk pengguna biasa\n`;
    menu += `🕐 ${BotUtils.getCurrentTime()}\n\n`;

    // Hanya tampilkan kategori untuk pengguna biasa
    const userCategories = ['umum', 'ai', 'media', 'tools', 'fun', 'text'];
    
    for (const catKey of userCategories) {
      const catName = this.categories[catKey];
      const commands = this.getByCategory(catKey).filter(cmd => !cmd.adminOnly);
      
      if (commands.length > 0) {
        menu += `${catName}:\n`;
        commands.forEach(cmd => {
          const prefix = cmd.premiumOnly ? '⭐ ' : '';
          menu += `${CONFIG.PREFIX}${cmd.name} - ${prefix}${cmd.description}\n`;
        });
        menu += '\n';
      }
    }

    menu += `💰 *Paket Premium*\n`;
    menu += `• Ketik ${CONFIG.PREFIX}paket untuk melihat daftar paket premium\n`;
    menu += `• Ketik ${CONFIG.PREFIX}beli untuk melihat informasi pembelian\n`;
    menu += `• Ketik ${CONFIG.PREFIX}beli [nama_paket] [durasi] untuk membeli paket\n`;
    menu += `• Ketik ${CONFIG.PREFIX}status untuk melihat status keanggotaan Anda\n\n`;
    
    menu += `💡 *Tips:*\n`;
    menu += `• Ketik ${CONFIG.PREFIX}help [nama_perintah] untuk bantuan detail\n`;
    menu += `• Chat langsung tanpa prefix untuk AI Assistant\n`;
    menu += `• Anda memiliki 50 pesan gratis per hari\n\n`;
    
    return menu;
  }
  
  getAdminMenu() {
    let menu = `*👑 ${CONFIG.BOT_NAME} - ADMIN PANEL*\n\n`;
    menu += `📱 Panel Admin Bot WhatsApp\n`;
    menu += `🕐 ${BotUtils.getCurrentTime()}\n\n`;

    // Tampilkan semua kategori untuk admin
    for (const [catKey, catName] of Object.entries(this.categories)) {
      const commands = this.getByCategory(catKey);
      if (commands.length > 0) {
        menu += `${catName}:\n`;
        commands.forEach(cmd => {
          const prefix = cmd.adminOnly ? '👑 ' : cmd.premiumOnly ? '⭐ ' : '';
          menu += `${CONFIG.PREFIX}${cmd.name} - ${prefix}${cmd.description}\n`;
        });
        menu += '\n';
      }
    }

    menu += `💡 *Admin Commands:*\n`;
    menu += `• ${CONFIG.PREFIX}broadcast - Kirim pesan ke semua pengguna\n`;
    menu += `• ${CONFIG.PREFIX}stats - Lihat statistik bot\n`;
    menu += `• ${CONFIG.PREFIX}setmembership - Atur membership pengguna\n`;
    menu += `• ${CONFIG.PREFIX}addcredits - Tambah kredit pengguna\n\n`;
    
    menu += `💰 *Manajemen Transaksi:*\n`;
    menu += `• ${CONFIG.PREFIX}transaksi - Lihat daftar transaksi pending\n`;
    menu += `• ${CONFIG.PREFIX}aktivasi [id_transaksi] - Aktivasi pembelian paket\n`;
    menu += `• ${CONFIG.PREFIX}tolak [id_transaksi] [alasan] - Tolak pembelian paket\n\n`;
    
    menu += `📊 Total: ${this.commands.size} perintah tersedia`;

    return menu;
  }
  
  getGroupMenu() {
    let menu = `*👥 ${CONFIG.BOT_NAME} - GROUP MENU*\n\n`;
    menu += `📱 Bot WhatsApp AI untuk grup\n`;
    menu += `🕐 ${BotUtils.getCurrentTime()}\n\n`;

    // Kategori yang cocok untuk grup
    const groupCategories = ['umum', 'ai', 'media', 'fun', 'tools'];
    
    for (const catKey of groupCategories) {
      const catName = this.categories[catKey];
      const commands = this.getByCategory(catKey).filter(cmd => !cmd.adminOnly);
      
      if (commands.length > 0) {
        menu += `${catName}:\n`;
        commands.forEach(cmd => {
          const prefix = cmd.premiumOnly ? '⭐ ' : '';
          menu += `${CONFIG.PREFIX}${cmd.name} - ${prefix}${cmd.description}\n`;
        });
        menu += '\n';
      }
    }

    menu += `💡 *Tips untuk Grup:*\n`;
    menu += `• Bot akan merespon jika dimention @${CONFIG.BOT_NAME}\n`;
    menu += `• Gunakan ${CONFIG.PREFIX}mute untuk menonaktifkan bot di grup\n`;
    menu += `• Gunakan ${CONFIG.PREFIX}unmute untuk mengaktifkan bot di grup\n\n`;
    
    return menu;
  }

  registerAllCommands() {
    // ===== UMUM =====
    this.register('menu', 'umum', 'Menampilkan semua menu bot', 
      async (msg) => {
        const sender = msg.from;
        const isGroup = sender.includes('@g.us');
        const isAdmin = BotUtils.isAdmin(sender);
        
        // Tentukan jenis menu berdasarkan pengirim
        // Menampilkan semua menu tanpa batasan untuk semua pengguna
        let menu;
        if (isGroup) {
          menu = this.getGroupMenu();
        } else if (isAdmin) {
          menu = this.getAdminMenu();
        } else {
          // Tampilkan menu lengkap untuk semua pengguna
          const userMenu = this.getUserMenu();
          const fullMenu = `${userMenu}\n\n💡 *Menu Tambahan:*\n• Ketik ${CONFIG.PREFIX}langganan untuk melihat informasi langganan dan kalkulator harga\n• Ketik ${CONFIG.PREFIX}langganan [tipe_paket] [jumlah] untuk menghitung harga\n  Contoh: ${CONFIG.PREFIX}langganan basic 2 premium 1`;
          menu = fullMenu;
        }
        
        await msg.reply(menu);
      });
      
    this.register('paket', 'umum', 'Menampilkan daftar paket premium',
      async (msg) => {
        const paketInfo = `💰 *DAFTAR PAKET PREMIUM*\n\n` +
                       `Tingkatkan pengalaman Anda dengan paket premium kami:\n\n` +
                       `🔹 *PAKET GRATIS*\n` +
                       `• 50 pesan per hari\n` +
                       `• Akses fitur dasar\n\n` +
                       `⭐ *PAKET BASIC*\n` +
                       `• 100 pesan per hari\n` +
                       `• Akses semua fitur AI\n` +
                       `• Rp 50.000/bulan\n\n` +
                       `✨ *PAKET PREMIUM*\n` +
                       `• 300 pesan per hari\n` +
                       `• Akses semua fitur\n` +
                       `• Prioritas respons\n` +
                       `• Rp 120.000/bulan\n\n` +
                       `💎 *PAKET PLATINUM*\n` +
                       `• 500 pesan per hari\n` +
                       `• Akses semua fitur\n` +
                       `• Prioritas respons\n` +
                       `• Dukungan premium\n` +
                       `• Rp 250.000/bulan\n\n` +
                       `🔰 *PAKET UNLIMITED*\n` +
                       `• Pesan tanpa batas\n` +
                       `• Akses semua fitur\n` +
                       `• Prioritas respons tertinggi\n` +
                       `• Dukungan premium 24/7\n` +
                       `• Rp 400.000/bulan\n\n` +
                       `Untuk berlangganan, ketik ${CONFIG.PREFIX}beli [nama_paket] [durasi]\n` +
                       `Contoh: ${CONFIG.PREFIX}beli basic 1m\n\n` +
                       `Durasi: 1m (1 bulan), 3m (3 bulan), 6m (6 bulan), 1y (1 tahun)`;
        
        await msg.reply(paketInfo);
      });
      
    this.register('beli', 'umum', 'Beli paket premium',
      async (msg, args) => {
        // Jika tidak ada argumen, tampilkan informasi paket
        if (args.length === 0) {
          const paketInfo = `💰 *DAFTAR PAKET PREMIUM*\n\n` +
                         `Tingkatkan pengalaman Anda dengan paket premium kami:\n\n` +
                         `⭐ *PAKET BASIC*\n` +
                         `• 100 pesan per hari\n` +
                         `• Akses semua fitur AI\n` +
                         `• Rp 50.000/bulan\n\n` +
                         `✨ *PAKET PREMIUM*\n` +
                         `• 300 pesan per hari\n` +
                         `• Akses semua fitur\n` +
                         `• Prioritas respons\n` +
                         `• Rp 120.000/bulan\n\n` +
                         `💎 *PAKET PLATINUM*\n` +
                         `• 500 pesan per hari\n` +
                         `• Akses semua fitur\n` +
                         `• Prioritas respons\n` +
                         `• Dukungan premium\n` +
                         `• Rp 250.000/bulan\n\n` +
                         `🔰 *PAKET UNLIMITED*\n` +
                         `• Pesan tanpa batas\n` +
                         `• Akses semua fitur\n` +
                         `• Prioritas respons tertinggi\n` +
                         `• Dukungan premium 24/7\n` +
                         `• Rp 400.000/bulan\n\n` +
                         `Untuk berlangganan, ketik ${CONFIG.PREFIX}beli [nama_paket] [durasi]\n` +
                         `Contoh: ${CONFIG.PREFIX}beli basic 1m\n\n` +
                         `Durasi: 1m (1 bulan), 3m (3 bulan), 6m (6 bulan), 1y (1 tahun)`;
          
          return await msg.reply(paketInfo);
        }
        
        // Jika hanya ada 1 argumen, tampilkan informasi durasi
        if (args.length === 1) {
          const packageType = args[0].toLowerCase();
          if (!['basic', 'premium', 'platinum', 'unlimited'].includes(packageType)) {
            return await msg.reply('❌ Tipe paket tidak valid. Gunakan: basic, premium, platinum, atau unlimited.');
          }
          
          let packageName = '';
          let packageEmoji = '';
          let basePrice = 0;
          
          switch (packageType) {
            case 'basic':
              basePrice = 50000;
              packageName = 'Basic';
              packageEmoji = '⭐';
              break;
            case 'premium':
              basePrice = 120000;
              packageName = 'Premium';
              packageEmoji = '✨';
              break;
            case 'platinum':
              basePrice = 250000;
              packageName = 'Platinum';
              packageEmoji = '💎';
              break;
            case 'unlimited':
              basePrice = 400000;
              packageName = 'Unlimited';
              packageEmoji = '🔰';
              break;
          }
          
          // Hitung harga untuk berbagai durasi
          const price1m = basePrice;
          const price3m = Math.round(basePrice * 3 * 0.9); // Diskon 10%
          const price6m = Math.round(basePrice * 6 * 0.85); // Diskon 15%
          const price1y = Math.round(basePrice * 12 * 0.8); // Diskon 20%
          
          // Format harga
          const formatted1m = price1m.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
          const formatted3m = price3m.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
          const formatted6m = price6m.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
          const formatted1y = price1y.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
          
          const durationInfo = `${packageEmoji} *PAKET ${packageName.toUpperCase()}*\n\n` +
                            `Informasi harga paket:\n\n` +
                            `1️⃣ *1 Bulan*\n` +
                            `• Harga: Rp ${formatted1m}\n\n` +
                            `3️⃣ *3 Bulan*\n` +
                            `• Harga: Rp ${formatted3m} (Diskon 10%)\n\n` +
                            `6️⃣ *6 Bulan*\n` +
                            `• Harga: Rp ${formatted6m} (Diskon 15%)\n\n` +
                            `🔟 *1 Tahun*\n` +
                            `• Harga: Rp ${formatted1y} (Diskon 20%)\n\n` +
                            `Silakan hubungi admin untuk informasi lebih lanjut.`;
          
          return await msg.reply(durationInfo);
        }
        
        if (args.length < 2) {
          return await msg.reply(`❌ Format salah!\nSilakan hubungi admin untuk informasi pembelian paket.`);
        }
        
        try {
          // Parse tipe paket
          const packageType = args[0].toLowerCase();
          if (!['basic', 'premium', 'platinum', 'unlimited'].includes(packageType)) {
            return await msg.reply('❌ Tipe paket tidak valid. Gunakan: basic, premium, platinum, atau unlimited.');
          }
          
          // Parse durasi
          const duration = args[1].toLowerCase();
          let months = 0;
          let durationText = '';
          
          if (duration === '1m') {
            months = 1;
            durationText = '1 bulan';
          } else if (duration === '3m') {
            months = 3;
            durationText = '3 bulan';
          } else if (duration === '6m') {
            months = 6;
            durationText = '6 bulan';
          } else if (duration === '1y' || duration === '12m') {
            months = 12;
            durationText = '1 tahun';
          } else {
            return await msg.reply('❌ Durasi tidak valid. Gunakan: 1m, 3m, 6m, atau 1y.');
          }
          
          // Hitung harga berdasarkan paket dan durasi
          let basePrice = 0;
          let packageName = '';
          let packageEmoji = '';
          
          switch (packageType) {
            case 'basic':
              basePrice = 50000;
              packageName = 'Basic';
              packageEmoji = '⭐';
              break;
            case 'premium':
              basePrice = 120000;
              packageName = 'Premium';
              packageEmoji = '✨';
              break;
            case 'platinum':
              basePrice = 250000;
              packageName = 'Platinum';
              packageEmoji = '💎';
              break;
            case 'unlimited':
              basePrice = 400000;
              packageName = 'Unlimited';
              packageEmoji = '🔰';
              break;
          }
          
          // Hitung total harga berdasarkan durasi
          let totalPrice = basePrice * months;
          
          // Berikan diskon untuk durasi lebih lama
          let discountPercent = 0;
          if (months === 3) {
            discountPercent = 10;
            totalPrice = Math.round(totalPrice * 0.9); // Diskon 10%
          } else if (months === 6) {
            discountPercent = 15;
            totalPrice = Math.round(totalPrice * 0.85); // Diskon 15%
          } else if (months === 12) {
            discountPercent = 20;
            totalPrice = Math.round(totalPrice * 0.8); // Diskon 20%
          }
          
          // Format harga dengan pemisah ribuan
          const formattedPrice = totalPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
          
          // Langsung tampilkan kalkulasi harga dan lanjutkan pembelian
          const calculationMessage = `${packageEmoji} *KALKULASI HARGA PAKET*\n\n` +
                                  `📦 *Paket:* ${packageEmoji} ${packageName}\n` +
                                  `⏱️ *Durasi:* ${durationText}\n` +
                                  `${discountPercent > 0 ? `🏷️ *Diskon:* ${discountPercent}%\n` : ''}` +
                                  `💵 *Total:* Rp ${formattedPrice}\n\n`;
          
          // Lanjutkan proses pembelian tanpa perlu konfirmasi tambahan
          
          // Cek apakah user adalah member
          const userId = msg.from.replace(/\D/g, '');
          let member = await this.memberManager.getMemberByPhone(userId);
          
          // Jika bukan member, daftarkan sebagai member baru
          if (!member) {
            const contact = await msg.getContact();
            const name = contact.pushname || contact.name || userId;
            
            const newMember = {
              phone: userId,
              name: name,
              status: 'approved',
              membership_type: 'free'
            };
            
            const result = await this.memberManager.addMember(newMember);
            member = await this.memberManager.getMemberById(result.id);
          }
          
          // Buat transaksi baru
          const transaction = {
            member_id: member.id,
            package_type: packageType,
            duration: duration,
            amount: totalPrice,
            payment_method: 'transfer',
            notes: `Pembelian paket ${packageName} selama ${durationText}`
          };
          
          const result = await this.transactionManager.createTransaction(transaction);
          
          // Kirim notifikasi ke admin
          const adminNotification = `💰 *PERMINTAAN PEMBELIAN PAKET*\n\n` +
                                  `Ada permintaan pembelian paket baru:\n\n` +
                                  `👤 *Pengguna:* ${member.name} (${userId})\n` +
                                  `📦 *Paket:* ${packageEmoji} ${packageName}\n` +
                                  `⏱️ *Durasi:* ${durationText}\n` +
                                  `💵 *Total:* Rp ${formattedPrice}\n` +
                                  `🆔 *ID Transaksi:* #${result.id}\n\n` +
                                  `Silakan aktivasi paket setelah melihat bukti pembayaran.`;
          
          // Kirim notifikasi ke semua admin
          if (CONFIG.ADMIN_NUMBER) {
            const adminNumbers = CONFIG.ADMIN_NUMBER.split(',');
            for (const adminNumber of adminNumbers) {
              const formattedAdminNumber = adminNumber.trim() + '@c.us';
              await this.client.sendMessage(formattedAdminNumber, adminNotification);
            }
          }
          
          // Kirim instruksi pembayaran ke pengguna
          // Gabungkan kalkulasi harga dengan instruksi pembayaran
          const paymentInstructions = `${calculationMessage}` +
                                    `${packageEmoji} *PEMBELIAN PAKET ${packageName.toUpperCase()}*\n\n` +
                                    `Terima kasih telah membeli paket ${packageName} selama ${durationText}.\n\n` +
                                    `💵 *Total Pembayaran:* Rp ${formattedPrice}\n` +
                                    `🆔 *ID Transaksi:* #${result.id}\n\n` +
                                    `Silakan transfer pembayaran ke rekening berikut:\n\n` +
                                    `🏦 *Bank BCA*\n` +
                                    `👤 *Nama:* John Doe\n` +
                                    `💳 *No. Rekening:* 1234567890\n\n` +
                                    `Setelah melakukan pembayaran, silakan kirim bukti transfer ke admin.`;
          
          await msg.reply(paymentInstructions);
          
        } catch (error) {
          console.error('Error processing purchase:', error);
          await msg.reply('❌ Terjadi kesalahan saat memproses pembelian. Silakan coba lagi nanti.');
        }
      });

    this.register('help', 'umum', 'Bantuan detail untuk perintah',
      async (msg, args) => {
        if (args.length === 0) {
          return await msg.reply(this.getMenu());
        }
        const command = this.get(args[0]);
        if (!command) {
          return await msg.reply(`❌ Perintah "${args[0]}" tidak ditemukan!`);
        }
        const help = `*📋 Bantuan Perintah*\n\n` +
          `🔸 Nama: ${CONFIG.PREFIX}${command.name}\n` +
          `🔸 Kategori: ${this.categories[command.category]}\n` +
          `🔸 Deskripsi: ${command.description}\n` +
          `🔸 Admin Only: ${command.adminOnly ? 'Ya' : 'Tidak'}\n` +
          `🔸 Premium Only: ${command.premiumOnly ? 'Ya' : 'Tidak'}\n` +
          `🔸 Total Penggunaan: ${command.usage}`;
        await msg.reply(help);
      });

    this.register('ping', 'umum', 'Cek status bot dan latency',
      async (msg) => {
        const start = Date.now();
        const response = await msg.reply('🏓 Pong! Mengecek latency...');
        const latency = Date.now() - start;
        
        const uptime = moment.duration(Date.now() - botStats.startTime);
        const uptimeStr = `${uptime.days()}d ${uptime.hours()}h ${uptime.minutes()}m`;
        
        const status = `*🤖 Status Bot*\n\n` +
          `✅ Status: Online\n` +
          `📶 Latency: ${latency}ms\n` +
          `⏱️ Uptime: ${uptimeStr}\n` +
          `📊 Pesan diterima: ${botStats.messagesReceived}\n` +
          `💬 Pesan dibalas: ${botStats.messagesResponded}\n` +
          `⚡ Perintah dijalankan: ${botStats.commandsExecuted}\n` +
          `👥 Total users: ${Object.keys(activeUsers).length}\n` +
          `🧠 AI Provider: ${aiManager.currentProvider}`;
        
        await response.edit(status);
      });

    this.register('about', 'umum', 'Informasi tentang bot',
      async (msg) => {
        const about = `*🤖 ${CONFIG.BOT_NAME}*\n\n` +
          `🔸 Versi: ${CONFIG.BOT_VERSION}\n` +
          `🔸 Dibuat dengan: Node.js & whatsapp-web.js\n` +
          `🔸 AI Engine: Multiple providers (Gemini, OpenAI, Claude, HuggingFace)\n` +
          `🔸 Database: SQLite\n` +
          `🔸 Fitur: 50+ perintah canggih\n\n` +
          `*🌟 Fitur Unggulan:*\n` +
          `• 🤖 Multi-AI Assistant\n` +
          `• 🎨 Media Processing\n` +
          `• 📊 Analytics & Statistics\n` +
          `• 🔒 Admin Management\n` +
          `• 📱 Web Dashboard\n` +
          `• 🌐 Multi-language Support\n` +
          `• ⚡ Real-time Processing\n\n` +
          `💡 Developed with ❤️ by AI Assistant`;
        
        await msg.reply(about);
      });

    this.register('status', 'umum', 'Status sistem bot',
      async (msg) => {
        const user = await database.getUser(msg.from.replace(/\D/g, ''));
        const memoryUsage = process.memoryUsage();
        
        const status = `*📊 Status Sistem*\n\n` +
          `*Bot Information:*\n` +
          `🤖 Name: ${CONFIG.BOT_NAME}\n` +
          `📦 Version: ${CONFIG.BOT_VERSION}\n` +
          `🧠 AI Provider: ${aiManager.currentProvider}\n` +
          `🌐 Available AIs: ${aiManager.getAvailableProviders().join(', ')}\n\n` +
          `*System Resources:*\n` +
          `💾 Memory Usage: ${BotUtils.formatFileSize(memoryUsage.rss)}\n` +
          `💾 Heap Used: ${BotUtils.formatFileSize(memoryUsage.heapUsed)}\n` +
          `📂 Temp Files: ${fs.readdirSync(CONFIG.TEMP_DIR).length}\n\n` +
          `*Your Account:*\n` +
          `👤 Status: ${user?.is_premium ? '⭐ Premium' : '🆓 Free'}\n` +
          `💳 Credits: ${user?.credits || 0}\n` +
          `📝 Total Messages: ${user?.total_messages || 0}\n` +
          `⚡ Commands Used: ${user?.total_commands || 0}`;
        
        await msg.reply(status);
      });

    // ===== AI COMMANDS =====
    this.register('ai', 'ai', 'Chat dengan AI (multi-provider)',
      async (msg, args) => {
        if (args.length === 0) {
          return await msg.reply(`💡 Gunakan: ${CONFIG.PREFIX}ai [pertanyaan]\nAtau chat langsung tanpa prefix!`);
        }
        
        const question = args.join(' ');
        const userId = msg.from.replace(/\D/g, '');
        
        try {
          const response = await aiManager.generateResponse(question, userId);
          await msg.reply(`${response}`);
        } catch (error) {
          await msg.reply('❌ Maaf, terjadi kesalahan saat memproses permintaan AI.');
        }
      });

    this.register('setai', 'ai', 'Ganti provider AI (gemini/openai/claude/huggingface)',
      async (msg, args) => {
        if (args.length === 0) {
          const available = aiManager.getAvailableProviders();
          return await msg.reply(`🤖 *Available AI Providers:*\n\n${available.map(p => `• ${p}`).join('\n')}\n\n` +
            `Current: ${aiManager.currentProvider}\n\n` +
            `Gunakan: ${CONFIG.PREFIX}setai [provider]`);
        }
        
        const provider = args[0].toLowerCase();
        if (aiManager.switchProvider(provider)) {
          await msg.reply(`✅ AI provider berhasil diganti ke: *${provider}*`);
        } else {
          await msg.reply(`❌ Provider "${provider}" tidak tersedia atau tidak terkonfigurasi.`);
        }
      });

    this.register('translate', 'ai', 'Terjemahkan teks ke bahasa lain',
      async (msg, args) => {
        if (args.length < 2) {
          return await msg.reply(`📝 Gunakan: ${CONFIG.PREFIX}translate [kode_bahasa] [teks]\n\n` +
            `Contoh: ${CONFIG.PREFIX}translate en Halo dunia\n` +
            `Kode bahasa: en, id, es, fr, de, ja, ko, zh, ar, ru`);
        }
        
        const targetLang = args[0];
        const text = args.slice(1).join(' ');
        
        try {
          const translated = await BotUtils.translateText(text, targetLang);
          const response = `🌐 *Translator*\n\n` +
            `📤 Original: ${text}\n` +
            `📥 Translated (${targetLang}): ${translated}`;
          await msg.reply(response);
        } catch (error) {
          await msg.reply('❌ Gagal menerjemahkan teks. Pastikan kode bahasa benar.');
        }
      });

    // ===== MEDIA COMMANDS =====
    this.register('stiker', 'media', 'Buat stiker dari gambar/video',
      async (msg) => {
        if (!msg.hasMedia && !msg.hasQuotedMsg) {
          return await msg.reply(`🎨 Kirim gambar/video dengan caption ${CONFIG.PREFIX}stiker atau reply media!`);
        }
        
        await msg.reply('🎨 Sedang membuat stiker...');
        
        try {
          let media;
          if (msg.hasMedia) {
            media = await msg.downloadMedia();
          } else {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.hasMedia) {
              media = await quotedMsg.downloadMedia();
            } else {
              return await msg.reply('❌ Media tidak ditemukan!');
            }
          }
          
          const tempPath = path.join(CONFIG.TEMP_DIR, `temp_${Date.now()}.${mime.extension(media.mimetype)}`);
          fs.writeFileSync(tempPath, media.data, 'base64');
          
          const stickerPath = await MultimediaProcessor.createSticker(tempPath);
          const stickerMedia = MessageMedia.fromFilePath(stickerPath);
          
          await msg.reply(stickerMedia, msg.from, { 
            sendMediaAsSticker: true, 
            stickerAuthor: CONFIG.BOT_NAME,
            stickerName: 'AI Bot Sticker'
          });
          
          // Cleanup
          fs.unlinkSync(tempPath);
          fs.unlinkSync(stickerPath);
        } catch (error) {
          await msg.reply('❌ Gagal membuat stiker. Pastikan media yang dikirim valid.');
        }
      });

    this.register('meme', 'media', 'Buat meme dari gambar dengan teks',
      async (msg, args) => {
        if (!msg.hasMedia && !msg.hasQuotedMsg) {
          return await msg.reply(`😂 Kirim gambar dengan caption ${CONFIG.PREFIX}meme [teks atas] | [teks bawah]`);
        }
        
        if (args.length === 0) {
          return await msg.reply(`😂 Gunakan: ${CONFIG.PREFIX}meme [teks atas] | [teks bawah]\n\nContoh: ${CONFIG.PREFIX}meme Saat kode error | Tapi tetap running`);
        }
        
        await msg.reply('😂 Sedang membuat meme...');
        
        try {
          let media;
          if (msg.hasMedia) {
            media = await msg.downloadMedia();
          } else {
            const quotedMsg = await msg.getQuotedMessage();
            media = await quotedMsg.downloadMedia();
          }
          
          const tempPath = path.join(CONFIG.TEMP_DIR, `temp_${Date.now()}.jpg`);
          fs.writeFileSync(tempPath, media.data, 'base64');
          
          const memeText = args.join(' ');
          const [topText, bottomText] = memeText.split('|').map(text => text?.trim() || '');
          
          const memePath = await MultimediaProcessor.addTextToImage(tempPath, topText, bottomText);
          const memeMedia = MessageMedia.fromFilePath(memePath);
          
          await msg.reply(memeMedia, msg.from, { 
            caption: `😂 Meme berhasil dibuat!\n\nTop: ${topText}\nBottom: ${bottomText}` 
          });
          
          // Cleanup
          fs.unlinkSync(tempPath);
          fs.unlinkSync(memePath);
        } catch (error) {
          await msg.reply('❌ Gagal membuat meme. Pastikan gambar valid.');
        }
      });

    this.register('ocr', 'media', 'Extract teks dari gambar',
      async (msg) => {
        if (!msg.hasMedia && !msg.hasQuotedMsg) {
          return await msg.reply(`👁️ Kirim gambar dengan caption ${CONFIG.PREFIX}ocr atau reply gambar!`);
        }
        
        await msg.reply('👁️ Sedang membaca teks dari gambar...');
        
        try {
          let media;
          if (msg.hasMedia) {
            media = await msg.downloadMedia();
          } else {
            const quotedMsg = await msg.getQuotedMessage();
            media = await quotedMsg.downloadMedia();
          }
          
          const tempPath = path.join(CONFIG.TEMP_DIR, `ocr_${Date.now()}.jpg`);
          fs.writeFileSync(tempPath, media.data, 'base64');
          
          const extractedText = await MultimediaProcessor.extractTextFromImage(tempPath);
          
          if (extractedText.trim()) {
            await msg.reply(`📖 *Teks yang ditemukan:*\n\n${extractedText}`);
          } else {
            await msg.reply('❌ Tidak ada teks yang dapat dibaca dari gambar.');
          }
          
          fs.unlinkSync(tempPath);
        } catch (error) {
          await msg.reply('❌ Gagal membaca teks dari gambar.');
        }
      });

    // ===== DOWNLOAD COMMANDS =====
    this.register('ytmp3', 'download', 'Download audio dari YouTube',
      async (msg, args) => {
        if (args.length === 0) {
          return await msg.reply(`🎵 Gunakan: ${CONFIG.PREFIX}ytmp3 [URL YouTube]`);
        }
        
        const url = args[0];
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
          return await msg.reply('❌ URL YouTube tidak valid!');
        }
        
        await msg.reply('🎵 Sedang mengunduh audio dari YouTube...\n⏳ Proses ini membutuhkan beberapa menit.');
        
        try {
          const audioPath = await MultimediaProcessor.downloadYouTubeAudio(url);
          const audioMedia = MessageMedia.fromFilePath(audioPath);
          const fileSize = fs.statSync(audioPath).size;
          
          if (fileSize > 64 * 1024 * 1024) { // 64MB limit
            fs.unlinkSync(audioPath);
            return await msg.reply('❌ File terlalu besar (max 64MB). Coba video yang lebih pendek.');
          }
          
          await msg.reply(audioMedia, msg.from, { 
            caption: `🎵 Audio berhasil diunduh!\n📁 Ukuran: ${BotUtils.formatFileSize(fileSize)}` 
          });
          
          fs.unlinkSync(audioPath);
        } catch (error) {
          await msg.reply('❌ Gagal mengunduh audio. Pastikan URL valid dan video tidak terlalu panjang.');
        }
      });

    this.register('ytmp4', 'download', 'Download video dari YouTube',
      async (msg, args) => {
        if (args.length === 0) {
          return await msg.reply(`🎬 Gunakan: ${CONFIG.PREFIX}ytmp4 [URL YouTube]`);
        }
        
        const url = args[0];
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
          return await msg.reply('❌ URL YouTube tidak valid!');
        }
        
        await msg.reply('🎬 Sedang mengunduh video dari YouTube...\n⏳ Proses ini membutuhkan beberapa menit.');
        
        try {
          const videoPath = await MultimediaProcessor.downloadYouTubeVideo(url);
          const videoMedia = MessageMedia.fromFilePath(videoPath);
          const fileSize = fs.statSync(videoPath).size;
          
          if (fileSize > 64 * 1024 * 1024) { // 64MB limit
            fs.unlinkSync(videoPath);
            return await msg.reply('❌ File terlalu besar (max 64MB). Coba video yang lebih pendek.');
          }
          
          await msg.reply(videoMedia, msg.from, { 
            caption: `🎬 Video berhasil diunduh!\n📁 Ukuran: ${BotUtils.formatFileSize(fileSize)}` 
          });
          
          fs.unlinkSync(videoPath);
        } catch (error) {
          await msg.reply('❌ Gagal mengunduh video. Pastikan URL valid dan video tidak terlalu panjang.');
        }
      });

    // ===== TOOLS COMMANDS =====
    this.register('qr', 'tools', 'Generate QR Code dari teks',
      async (msg, args) => {
        if (args.length === 0) {
          return await msg.reply(`📱 Gunakan: ${CONFIG.PREFIX}qr [teks/URL]`);
        }
        
        const text = args.join(' ');
        await msg.reply('📱 Sedang membuat QR Code...');
        
        try {
          const qrPath = await BotUtils.createQRCode(text);
          const qrMedia = MessageMedia.fromFilePath(qrPath);
          
          await msg.reply(qrMedia, msg.from, { 
            caption: `📱 QR Code untuk: ${text.length > 50 ? text.substring(0, 50) + '...' : text}` 
          });
          
          fs.unlinkSync(qrPath);
        } catch (error) {
          await msg.reply('❌ Gagal membuat QR Code.');
        }
      });

    this.register('tts', 'tools', 'Text to Speech',
      async (msg, args) => {
        if (args.length === 0) {
          return await msg.reply(`🔊 Gunakan: ${CONFIG.PREFIX}tts [teks]\n\nContoh: ${CONFIG.PREFIX}tts Halo, ini adalah tes text to speech`);
        }
        
        const text = args.join(' ');
        if (text.length > 200) {
          return await msg.reply('❌ Teks terlalu panjang! Maksimal 200 karakter.');
        }
        
        await msg.reply('🔊 Sedang mengubah teks menjadi suara...');
        
        try {
          const audioPath = await BotUtils.textToSpeech(text);
          const audioMedia = MessageMedia.fromFilePath(audioPath);
          
          await msg.reply(audioMedia, msg.from, { 
            caption: `🔊 Text to Speech:\n"${text}"` 
          });
          
          fs.unlinkSync(audioPath);
        } catch (error) {
          await msg.reply('❌ Gagal mengubah teks menjadi suara.');
        }
      });

    this.register('calc', 'tools', 'Kalkulator matematik',
      async (msg, args) => {
        if (args.length === 0) {
          return await msg.reply(`🧮 Gunakan: ${CONFIG.PREFIX}calc [ekspresi]\n\nContoh: ${CONFIG.PREFIX}calc 2 + 2 * 3`);
        }
        
        const expression = args.join(' ');
        
        try {
          const result = BotUtils.calculateExpression(expression);
          await msg.reply(`🧮 *Kalkulator*\n\n${expression} = *${result}*`);
        } catch (error) {
          await msg.reply('❌ Ekspresi matematika tidak valid!');
        }
      });

    this.register('shorturl', 'tools', 'Persingkat URL',
      async (msg, args) => {
        if (args.length === 0) {
          return await msg.reply(`🔗 Gunakan: ${CONFIG.PREFIX}shorturl [URL]`);
        }
        
        const url = args[0];
        if (!url.startsWith('http')) {
          return await msg.reply('❌ URL harus dimulai dengan http:// atau https://');
        }
        
        await msg.reply('🔗 Sedang mempersingkat URL...');
        
        try {
          const shortUrl = await BotUtils.shortenUrl(url);
          await msg.reply(`🔗 *URL Shortener*\n\n📤 Original: ${url}\n📥 Shortened: ${shortUrl}`);
        } catch (error) {
          await msg.reply('❌ Gagal mempersingkat URL.');
        }
      });

    this.register('password', 'tools', 'Generate password acak',
      async (msg, args) => {
        const length = parseInt(args[0]) || 12;
        if (length < 4 || length > 50) {
          return await msg.reply('❌ Panjang password harus antara 4-50 karakter!');
        }
        
        const password = BotUtils.generatePassword(length);
        await msg.reply(`🔐 *Password Generator*\n\nLength: ${length}\nPassword: \`${password}\`\n\n⚠️ Simpan dengan aman!`);
      });

    this.register('hash', 'tools', 'Hash generator (MD5, SHA1, SHA256, SHA512)',
      async (msg, args) => {
        if (args.length === 0) {
          return await msg.reply(`#️⃣ Gunakan: ${CONFIG.PREFIX}hash [teks] [algoritma]\n\nAlgoritma: md5, sha1, sha256, sha512`);
        }
        
        const text = args.slice(0, -1).join(' ') || args.join(' ');
        const algorithm = args[args.length - 1] || 'md5';
        
        try {
          const hash = BotUtils.hashText(text, algorithm);
          await msg.reply(`#️⃣ *Hash Generator*\n\nText: ${text}\nAlgorithm: ${algorithm}\nHash: ${hash}`);
        } catch (error) {
          await msg.reply('❌ Gagal membuat hash.');
        }
      });

    this.register('base64', 'tools', 'Encode/decode Base64',
      async (msg, args) => {
        if (args.length < 2) {
          return await msg.reply(`🔐 Gunakan:\n${CONFIG.PREFIX}base64 encode [teks]\n${CONFIG.PREFIX}base64 decode [base64]`);
        }
        
        const action = args[0].toLowerCase();
        const text = args.slice(1).join(' ');
        
        try {
          if (action === 'encode') {
            const encoded = BotUtils.encodeBase64(text);
            await msg.reply(`🔐 *Base64 Encoder*\n\nOriginal: ${text}\nEncoded: ${encoded}`);
          } else if (action === 'decode') {
            const decoded = BotUtils.decodeBase64(text);
            await msg.reply(`🔓 *Base64 Decoder*\n\nEncoded: ${text}\nDecoded: ${decoded}`);
          } else {
            await msg.reply('❌ Action harus "encode" atau "decode"');
          }
        } catch (error) {
          await msg.reply('❌ Gagal memproses Base64.');
        }
      });

    // ===== FUN COMMANDS =====
    this.register('joke', 'fun', 'Cerita lucu random',
      async (msg) => {
        const joke = BotUtils.getRandomJoke();
        await msg.reply(`😂 *Joke Random*\n\n${joke}`);
      });

    this.register('quote', 'fun', 'Quote inspiratif random',
      async (msg) => {
        const quote = BotUtils.getRandomQuote();
        await msg.reply(`💭 *Quote Inspiratif*\n\n${quote}`);
      });

    this.register('8ball', 'fun', 'Magic 8-ball (tanya keberuntungan)',
      async (msg, args) => {
        if (args.length === 0) {
          return await msg.reply(`🎱 Gunakan: ${CONFIG.PREFIX}8ball [pertanyaan]\n\nContoh: ${CONFIG.PREFIX}8ball Apakah hari ini beruntung?`);
        }
        
        const question = args.join(' ');
        const answer = BotUtils.get8BallResponse();
        await msg.reply(`🎱 *Magic 8-Ball*\n\n❓ Pertanyaan: ${question}\n🎯 Jawaban: ${answer}`);
      });

    this.register('flipcoin', 'fun', 'Lempar koin virtual',
      async (msg) => {
        const result = BotUtils.flipCoin();
        await msg.reply(`🪙 *Lempar Koin*\n\nHasil: ${result}`);
      });

    this.register('dice', 'fun', 'Lempar dadu virtual',
      async (msg, args) => {
        const sides = parseInt(args[0]) || 6;
        if (sides < 2 || sides > 100) {
          return await msg.reply('❌ Jumlah sisi dadu harus antara 2-100!');
        }
        
        const result = BotUtils.rollDice(sides);
        await msg.reply(`🎲 *Lempar Dadu ${sides} Sisi*\n\nHasil: ${result}`);
      });

    this.register('random', 'fun', 'Generate angka acak',
      async (msg, args) => {
        const min = parseInt(args[0]) || 1;
        const max = parseInt(args[1]) || 100;
        
        if (min >= max) {
          return await msg.reply('❌ Nilai minimum harus lebih kecil dari maksimum!');
        }
        
        const result = BotUtils.generateRandomNumber(min, max);
        await msg.reply(`🎲 *Random Number*\n\nRange: ${min} - ${max}\nHasil: ${result}`);
      });

    // ===== INFO COMMANDS =====
    this.register('time', 'info', 'Waktu saat ini',
      async (msg) => {
        const time = BotUtils.getCurrentTime();
        await msg.reply(`🕐 *Waktu Saat Ini*\n\n${time}`);
      });

    this.register('weather', 'info', 'Cek cuaca kota',
      async (msg, args) => {
        if (args.length === 0) {
          return await msg.reply(`🌤️ Gunakan: ${CONFIG.PREFIX}weather [nama kota]\n\nContoh: ${CONFIG.PREFIX}weather Jakarta`);
        }
        
        const location = args.join(' ');
        await msg.reply('🌤️ Sedang mengambil data cuaca...');
        
        try {
          const weatherData = await BotUtils.getWeather(location);
          
          if (!weatherData || weatherData.length === 0) {
            return await msg.reply(`❌ Data cuaca untuk "${location}" tidak ditemukan.`);
          }
          
          const current = weatherData[0].current;
          const forecast = weatherData[0].forecast;
          const locationData = weatherData[0].location;
          
          let weatherMsg = `🌤️ *Cuaca ${locationData.name}*\n\n`;
          weatherMsg += `*Saat ini:*\n`;
          weatherMsg += `🌡️ Suhu: ${current.temperature}°C\n`;
          weatherMsg += `☁️ Kondisi: ${current.skytext}\n`;
          weatherMsg += `💨 Kelembaban: ${current.humidity}%\n`;
          weatherMsg += `🌬️ Angin: ${current.winddisplay}\n\n`;
          
          weatherMsg += `*Prakiraan 3 Hari:*\n`;
          forecast.slice(0, 3).forEach((day, index) => {
            weatherMsg += `📅 ${day.day}: ${day.low}°C - ${day.high}°C, ${day.skytextday}\n`;
          });
          
          await msg.reply(weatherMsg);
        } catch (error) {
          await msg.reply('❌ Gagal mengambil data cuaca.');
        }
      });

    this.register('search', 'info', 'Cari di Google',
      async (msg, args) => {
        if (args.length === 0) {
          return await msg.reply(`🔍 Gunakan: ${CONFIG.PREFIX}search [kata kunci]`);
        }
        
        const query = args.join(' ');
        await msg.reply('🔍 Sedang mencari di Google...');
        
        try {
          const results = await BotUtils.searchGoogle(query, 5);
          
          if (results.length === 0) {
            return await msg.reply(`❌ Tidak ada hasil pencarian untuk "${query}".`);
          }
          
          let searchMsg = `🔍 *Hasil pencarian: "${query}"*\n\n`;
          results.forEach((result, index) => {
            searchMsg += `${index + 1}. *${result.title}*\n`;
            searchMsg += `📝 ${result.snippet}\n`;
            searchMsg += `🔗 ${result.link}\n\n`;
          });
          
          await msg.reply(searchMsg);
        } catch (error) {
          await msg.reply('❌ Gagal melakukan pencarian.');
        }
      });

    // ===== ADMIN COMMANDS =====
    this.register('stats', 'admin', 'Statistik bot lengkap', async (msg) => {
      const totalUsers = await new Promise(resolve => {
        database.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
          resolve(row ? row.count : 0);
        });
      });
      
      const todayStats = await new Promise(resolve => {
        database.db.get('SELECT * FROM bot_stats WHERE date = ?', [new Date().toISOString().split('T')[0]], (err, row) => {
          resolve(row || { total_messages: 0, total_commands: 0, ai_requests: 0 });
        });
      });
      
      const memoryUsage = process.memoryUsage();
      const uptime = moment.duration(Date.now() - botStats.startTime);
      
      const stats = `*📊 Statistik Bot Lengkap*\n\n` +
        `*Sistem:*\n` +
        `⏱️ Uptime: ${uptime.days()}d ${uptime.hours()}h ${uptime.minutes()}m\n` +
        `💾 Memory: ${BotUtils.formatFileSize(memoryUsage.rss)}\n` +
        `🤖 AI Provider: ${aiManager.currentProvider}\n\n` +
        `*Users:*\n` +
        `👥 Total Users: ${totalUsers}\n` +
        `📱 Active Sessions: ${Object.keys(activeUsers).length}\n\n` +
        `*Hari Ini:*\n` +
        `💬 Messages: ${todayStats.total_messages}\n` +
        `⚡ Commands: ${todayStats.total_commands}\n` +
        `🧠 AI Requests: ${todayStats.ai_requests}\n\n` +
        `*All Time:*\n` +
        `📊 Total Messages: ${botStats.messagesReceived}\n` +
        `📝 Total Responses: ${botStats.messagesResponded}\n` +
        `⚡ Total Commands: ${botStats.commandsExecuted}\n` +
        `❌ Errors: ${botStats.errors}`;
      
      await msg.reply(stats);
    }, true);

    this.register('broadcast', 'admin', 'Kirim pesan ke semua user', async (msg, args) => {
      if (args.length === 0) {
        return await msg.reply(`📢 Gunakan: ${CONFIG.PREFIX}broadcast [pesan]`);
      }
      
      const message = args.join(' ');
      await msg.reply('📢 Sedang mengirim broadcast...');
      
      try {
        const chats = await client.getChats();
        let success = 0;
        let failed = 0;
        
        for (const chat of chats.slice(0, 50)) { // Limit to prevent spam
          try {
            await client.sendMessage(chat.id._serialized, `*📢 BROADCAST MESSAGE*\n\n${message}\n\n_Sent by ${CONFIG.BOT_NAME}_`);
            success++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to prevent blocking
          } catch (error) {
            failed++;
          }
        }
        
        await msg.reply(`✅ Broadcast selesai!\n📤 Berhasil: ${success}\n❌ Gagal: ${failed}`);
      } catch (error) {
        await msg.reply('❌ Gagal mengirim broadcast.');
      }
    }, true);

    this.register('backup', 'admin', 'Backup database', async (msg) => {
      await msg.reply('💾 Sedang membuat backup...');
      
      try {
        const backupDir = './backups';
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir);
        }
        
        const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
        const backupPath = path.join(backupDir, `backup_${timestamp}.zip`);
        
        const output = fs.createWriteStream(backupPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', async () => {
          const backupMedia = MessageMedia.fromFilePath(backupPath);
          await msg.reply(backupMedia, msg.from, { 
            caption: `💾 Backup berhasil dibuat!\n📅 ${timestamp}\n📁 Size: ${BotUtils.formatFileSize(archive.pointer())}` 
          });
        });
        
        archive.pipe(output);
        archive.directory('./database/', 'database/');
        archive.directory('./logs/', 'logs/');
        archive.finalize();
        
      } catch (error) {
        await msg.reply('❌ Gagal membuat backup.');
      }
    }, true);

    this.register('restart', 'admin', 'Restart bot', async (msg) => {
      await msg.reply('🔄 Bot akan direstart dalam 5 detik...');
      setTimeout(() => {
        process.exit(0);
      }, 5000);
    }, true);

    this.register('maintenance', 'admin', 'Toggle maintenance mode', async (msg, args) => {
      const mode = args[0] === 'on';
      maintenanceMode = mode;
      
      await msg.reply(`🔧 Maintenance mode: ${mode ? 'ON' : 'OFF'}`);
    }, true);

    // ===== IMAGE GENERATION =====
    this.register('gambar', 'image', 'Buat gambar dengan AI dari deskripsi teks', async (msg, args) => {
      const bot = global.botInstance;
      if (!bot || !bot.stabilityAI) {
        return await msg.reply('❌ Fitur pembuatan gambar belum diaktifkan. Silakan hubungi admin untuk mengaktifkan API key Stability AI.');
      }

      if (args.length === 0) {
        return await msg.reply(`🖼️ Gunakan: ${CONFIG.PREFIX}gambar [deskripsi gambar]\n\nContoh: ${CONFIG.PREFIX}gambar pemandangan gunung dengan matahari terbenam`);
      }

      const prompt = args.join(' ');
      await msg.reply('🎨 Sedang membuat gambar... Mohon tunggu sebentar (15-30 detik)');

      try {
        const result = await bot.stabilityAI.generateImage(prompt);
        const media = MessageMedia.fromFilePath(result.path);
        await msg.reply(media, { caption: `🖼️ *Gambar AI*\n\n*Prompt:* ${prompt}\n*Seed:* ${result.seed}` });
      } catch (error) {
        console.error('Error generating image:', error);
        await msg.reply(`❌ Gagal membuat gambar: ${error.message}`);
      }
    });

    this.register('gambar-advanced', 'image', 'Buat gambar AI dengan pengaturan lanjutan', async (msg, args) => {
      const bot = global.botInstance;
      if (!bot || !bot.stabilityAI) {
        return await msg.reply('❌ Fitur pembuatan gambar belum diaktifkan. Silakan hubungi admin untuk mengaktifkan API key Stability AI.');
      }

      // Format: !gambar-advanced [prompt] --style [style] --negative [negative prompt] --size [width]x[height]
      if (args.length === 0) {
        return await msg.reply(`🖼️ Gunakan: ${CONFIG.PREFIX}gambar-advanced [deskripsi] --style [gaya] --negative [prompt negatif] --size [lebar]x[tinggi]\n\nStyle: photographic, digital-art, anime, cinematic, painting, pixel-art, fantasy-art, line-art, analog-film, neon-punk, isometric, low-poly, origami, modeling-compound, 3d-model\nSize: 1024x1024 (default), 1024x576, 576x1024`);
      }

      // Parse arguments
      let prompt = '';
      let style = 'photographic';
      let negativePrompt = '';
      let width = 1024;
      let height = 1024;

      // Extract main prompt (everything before first --)
      const firstFlagIndex = args.findIndex(arg => arg.startsWith('--'));
      if (firstFlagIndex === -1) {
        prompt = args.join(' ');
      } else {
        prompt = args.slice(0, firstFlagIndex).join(' ');
      }

      // Extract flags
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--style' && i + 1 < args.length) {
          style = args[i + 1];
          i++;
        } else if (args[i] === '--negative' && i + 1 < args.length) {
          // Collect all text until next flag or end
          const nextFlagIndex = args.findIndex((arg, idx) => idx > i + 1 && arg.startsWith('--'));
          if (nextFlagIndex === -1) {
            negativePrompt = args.slice(i + 1).join(' ');
            break;
          } else {
            negativePrompt = args.slice(i + 1, nextFlagIndex).join(' ');
            i = nextFlagIndex - 1;
          }
        } else if (args[i] === '--size' && i + 1 < args.length) {
          const sizeStr = args[i + 1];
          const sizeParts = sizeStr.split('x');
          if (sizeParts.length === 2) {
            width = parseInt(sizeParts[0]);
            height = parseInt(sizeParts[1]);
          }
          i++;
        }
      }

      if (!prompt) {
        return await msg.reply('❌ Deskripsi gambar tidak boleh kosong!');
      }

      await msg.reply('🎨 Sedang membuat gambar dengan pengaturan lanjutan... Mohon tunggu sebentar (15-30 detik)');

      try {
        const options = {
          style_preset: style,
          negative_prompt: negativePrompt,
          width: width,
          height: height,
          samples: 1
        };

        const result = await bot.stabilityAI.generateImage(prompt, options);
        const media = MessageMedia.fromFilePath(result.path);
        
        let caption = `🖼️ *Gambar AI Advanced*\n\n`;
        caption += `*Prompt:* ${prompt}\n`;
        caption += `*Style:* ${style}\n`;
        if (negativePrompt) caption += `*Negative:* ${negativePrompt}\n`;
        caption += `*Size:* ${width}x${height}\n`;
        caption += `*Seed:* ${result.seed}`;
        
        await msg.reply(media, { caption });
      } catch (error) {
        console.error('Error generating advanced image:', error);
        await msg.reply(`❌ Gagal membuat gambar: ${error.message}`);
      }
    }, false, true); // Premium only

    this.register('gambar-styles', 'image', 'Lihat daftar gaya gambar AI yang tersedia', async (msg) => {
      const styles = [
        { name: 'photographic', desc: 'Foto realistis dengan detail tinggi' },
        { name: 'digital-art', desc: 'Seni digital modern dengan warna-warna cerah' },
        { name: 'anime', desc: 'Gaya anime/manga Jepang' },
        { name: 'cinematic', desc: 'Tampilan sinematik seperti film' },
        { name: 'painting', desc: 'Lukisan artistik' },
        { name: 'pixel-art', desc: 'Gaya pixel retro seperti game jadul' },
        { name: 'fantasy-art', desc: 'Seni fantasi dengan elemen magis' },
        { name: 'line-art', desc: 'Gambar garis hitam putih' },
        { name: 'analog-film', desc: 'Efek film analog/vintage' },
        { name: 'neon-punk', desc: 'Gaya cyberpunk dengan warna neon' },
        { name: 'isometric', desc: 'Perspektif isometrik 3D' },
        { name: 'low-poly', desc: 'Model 3D dengan poligon rendah' },
        { name: 'origami', desc: 'Gaya seni lipat kertas' },
        { name: 'modeling-compound', desc: 'Seperti dibuat dari clay/plastisin' },
        { name: '3d-model', desc: 'Model 3D realistis' }
      ];

      let message = `🎨 *DAFTAR GAYA GAMBAR AI*\n\n`;
      message += `Gunakan dengan perintah: ${CONFIG.PREFIX}gambar-advanced [deskripsi] --style [nama_gaya]\n\n`;

      styles.forEach(style => {
        message += `• *${style.name}*: ${style.desc}\n`;
      });

      message += `\n💡 Contoh: ${CONFIG.PREFIX}gambar-advanced kucing lucu di taman --style pixel-art`;
      message += `\n\n📝 Untuk melihat contoh gambar dari gaya tertentu, gunakan: ${CONFIG.PREFIX}contoh-style [nama_gaya]`;

      await msg.reply(message);
    });

    this.register('contoh-style', 'image', 'Lihat contoh gambar dari gaya tertentu', async (msg, args) => {
      const bot = global.botInstance;
      if (!bot || !bot.stabilityAI) {
        return await msg.reply('❌ Fitur pembuatan gambar belum diaktifkan. Silakan hubungi admin untuk mengaktifkan API key Stability AI.');
      }

      if (args.length === 0) {
        return await msg.reply(`🖼️ Gunakan: ${CONFIG.PREFIX}contoh-style [nama_gaya]\n\nGunakan ${CONFIG.PREFIX}gambar-styles untuk melihat daftar gaya yang tersedia.`);
      }

      const style = args[0].toLowerCase();
      if (!bot.stabilityAI.isValidStylePreset(style)) {
        return await msg.reply(`❌ Gaya "${style}" tidak valid. Gunakan ${CONFIG.PREFIX}gambar-styles untuk melihat daftar gaya yang tersedia.`);
      }

      await msg.reply(`🎨 Membuat contoh gambar dengan gaya "${style}"... Mohon tunggu sebentar.`);

      try {
        // Buat contoh gambar dengan prompt umum
        const prompt = `A beautiful landscape with mountains and a lake, ${style} style`;
        const options = {
          style_preset: style,
          width: 1024,
          height: 1024,
          samples: 1
        };

        const result = await bot.stabilityAI.generateImage(prompt, options);
        const media = MessageMedia.fromFilePath(result.path);
        
        await msg.reply(media, { caption: `🖼️ *Contoh Gaya: ${style}*\n\nGunakan gaya ini dengan perintah:\n${CONFIG.PREFIX}gambar-advanced [deskripsi] --style ${style}` });
      } catch (error) {
        console.error(`Error generating style example for ${style}:`, error);
        await msg.reply(`❌ Gagal membuat contoh gambar: ${error.message}`);
      }
    });

    this.register('gambar-sizes', 'image', 'Lihat ukuran gambar yang tersedia', async (msg) => {
      const sizes = [
        { size: '1024x1024', desc: 'Persegi (default)' },
        { size: '1024x576', desc: 'Landscape (16:9)' },
        { size: '576x1024', desc: 'Portrait (9:16)' },
        { size: '768x768', desc: 'Persegi (lebih kecil)' },
        { size: '832x1216', desc: 'Portrait (2:3)' },
        { size: '1216x832', desc: 'Landscape (3:2)' },
        { size: '1152x896', desc: 'Landscape (4:3)' },
        { size: '896x1152', desc: 'Portrait (3:4)' }
      ];

      let message = `📏 *UKURAN GAMBAR AI*\n\n`;
      message += `Gunakan dengan perintah: ${CONFIG.PREFIX}gambar-advanced [deskripsi] --size [ukuran]\n\n`;

      sizes.forEach(item => {
        message += `• *${item.size}*: ${item.desc}\n`;
      });

      message += `\n💡 Contoh: ${CONFIG.PREFIX}gambar-advanced pemandangan gunung --size 1024x576`;

      await msg.reply(message);
    });
  }
}

// ========================================
// MAIN BOT CLASS
// ========================================

class WhatsAppBot {
  constructor() {
    this.client = null;
    this.database = null;
    this.aiManager = null;
    this.commandRegistry = null;
    this.rateLimitManager = null;
    this.botStats = {
      startTime: Date.now(),
      messagesReceived: 0,
      messagesResponded: 0,
      commandsExecuted: 0,
      errors: 0
    };
    this.activeUsers = {};
    this.maintenanceMode = false;
    
    // Store bot instance globally for access from command handlers
    global.botInstance = this;
    
    this.init();
  }

  init() {
    // Initialize components
    this.database = new Database();
    this.templateManager = new TemplateManager(this.database.db);
    this.memberManager = new MemberManager(this.database.db);
    this.transactionManager = new TransactionManager(this.database.db);
    this.aiManager = new AIManager();
    this.commandRegistry = new CommandRegistry();
    this.rateLimitManager = new RateLimitManager();
    
    // Initialize Stability AI for image generation
    if (CONFIG.STABILITY_API_KEY) {
      this.stabilityAI = new StabilityAI(CONFIG.STABILITY_API_KEY, CONFIG.UPLOADS_DIR + '/stability');
      console.log('✅ Stability AI initialized for image generation');
    } else {
      console.log('⚠️ Stability AI not initialized: API key missing');
      this.stabilityAI = null;
    }
    
    // Register additional commands
    registerAdditionalCommands(this);
    
    // Inisialisasi array untuk menyimpan admin numbers
    this.adminNumbers = [];
    
    // Initialize WhatsApp client
    this.initClient();
    
    // Setup periodic tasks
    this.setupPeriodicTasks();
    
    // Setup web dashboard
    this.setupWebDashboard();
    
    console.log('🚀 Bot initialization completed!');
  }

  initClient() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: './auth_data'
      }),
      puppeteer: {
        headless: CONFIG.WHATSAPP_HEADLESS,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        // Tambahkan opsi defaultViewport untuk tampilan yang lebih baik
        defaultViewport: null
      },
      qrTimeoutMs: CONFIG.WHATSAPP_QR_TIMEOUT, // Timeout untuk QR code
      authTimeoutMs: 0, // Tidak ada timeout untuk autentikasi
      restartOnAuthFail: true, // Restart otomatis jika autentikasi gagal
      takeoverOnConflict: true, // Ambil alih sesi jika ada konflik
      takeoverTimeoutMs: 0 // Tidak ada timeout untuk pengambilalihan
    });

    this.setupEventHandlers();
    
    // Load WhatsApp settings from database
    this.loadWhatsAppSettingsFromDatabase();
    
    console.log(`📱 WhatsApp client initialized with headless mode: ${CONFIG.WHATSAPP_HEADLESS ? 'ON' : 'OFF'}`);
  }
  
  // Fungsi untuk menyimpan status WhatsApp ke database
  async saveWhatsAppStatusToDatabase(status, qrCode = null, qrImageUrl = null) {
    try {
      // Hapus data lama
      await this.database.db.run('DELETE FROM whatsapp_status');
      
      // Simpan data baru
      await this.database.db.run(
        'INSERT INTO whatsapp_status (status, qr_code, qr_image_url, last_updated) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [status, qrCode, qrImageUrl]
      );
      
      console.log(`WhatsApp status saved to database: ${status}`);
    } catch (error) {
      console.error('Error saving WhatsApp status to database:', error);
    }
  }
  
  // Fungsi untuk mendapatkan status WhatsApp dari database
  async getWhatsAppStatusFromDatabase() {
    try {
      const result = await this.database.db.get('SELECT * FROM whatsapp_status ORDER BY last_updated DESC LIMIT 1');
      return result || { status: 'offline', qr_code: null, qr_image_url: null };
    } catch (error) {
      console.error('Error getting WhatsApp status from database:', error);
      return { status: 'offline', qr_code: null, qr_image_url: null };
    }
  }
  
  // Fungsi untuk memuat pengaturan WhatsApp dari database
  async loadWhatsAppSettingsFromDatabase() {
    try {
      // Cek apakah pengaturan sudah ada di database
      const headlessSetting = await this.database.db.get('SELECT value FROM bot_settings WHERE key = ?', ['whatsapp_headless']);
      const qrTimeoutSetting = await this.database.db.get('SELECT value FROM bot_settings WHERE key = ?', ['whatsapp_qr_timeout']);
      const reconnectAttemptsSetting = await this.database.db.get('SELECT value FROM bot_settings WHERE key = ?', ['whatsapp_reconnect_attempts']);
      
      // Jika pengaturan ada, gunakan nilai dari database
      if (headlessSetting) {
        CONFIG.WHATSAPP_HEADLESS = headlessSetting.value === 'true';
      }
      
      if (qrTimeoutSetting) {
        CONFIG.WHATSAPP_QR_TIMEOUT = parseInt(qrTimeoutSetting.value);
      }
      
      if (reconnectAttemptsSetting) {
        CONFIG.WHATSAPP_RECONNECT_ATTEMPTS = parseInt(reconnectAttemptsSetting.value);
      }
      
      // Jika pengaturan tidak ada, simpan pengaturan default ke database
      if (!headlessSetting) {
        await this.database.db.run(
          'INSERT INTO bot_settings (key, value) VALUES (?, ?)',
          ['whatsapp_headless', CONFIG.WHATSAPP_HEADLESS.toString()]
        );
      }
      
      if (!qrTimeoutSetting) {
        await this.database.db.run(
          'INSERT INTO bot_settings (key, value) VALUES (?, ?)',
          ['whatsapp_qr_timeout', CONFIG.WHATSAPP_QR_TIMEOUT.toString()]
        );
      }
      
      if (!reconnectAttemptsSetting) {
        await this.database.db.run(
          'INSERT INTO bot_settings (key, value) VALUES (?, ?)',
          ['whatsapp_reconnect_attempts', CONFIG.WHATSAPP_RECONNECT_ATTEMPTS.toString()]
        );
      }
      
      console.log('WhatsApp settings loaded from database');
    } catch (error) {
      console.error('Error loading WhatsApp settings from database:', error);
    }
  }

  setupEventHandlers() {
    // Menyimpan QR code terakhir untuk ditampilkan di web dashboard
    this.lastQR = null;
    
    this.client.on('qr', async (qr) => {
      console.log('📱 QR Code received. Scan dengan WhatsApp:');
      qrcode.generate(qr, { small: true });
      
      // Simpan QR code untuk ditampilkan di web dashboard
      this.lastQR = qr;
      
      // Simpan QR code ke database
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qr)}`;
      await this.saveWhatsAppStatusToDatabase('connecting', qr, qrImageUrl);
    });

    this.client.on('ready', async () => {
      console.log(`✅ ${CONFIG.BOT_NAME} is now online!`);
      console.log(`📱 Use ${CONFIG.PREFIX}menu to see available commands`);
      this.botStats.startTime = Date.now();
      
      // Simpan status online ke database
      await this.saveWhatsAppStatusToDatabase('online');
    });

    this.client.on('message', async (message) => {
      await this.handleMessage(message);
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Authentication failure:', msg);
    });

    this.client.on('disconnected', async (reason) => {
      console.log('📱 Client disconnected:', reason);
      
      // Simpan status offline ke database
      await this.saveWhatsAppStatusToDatabase('offline');
      
      setTimeout(() => {
        this.client.initialize();
      }, 5000);
    });

    // Event listener untuk status WhatsApp
    this.client.on('change_state', async state => {
      console.log('Client state changed to:', state);
      const status = state === 'CONNECTED' ? 'online' : 'offline';
      this.botStats.whatsappStatus = status;
      
      // Simpan status ke database
      await this.saveWhatsAppStatusToDatabase(status);
    });

    // Event listener untuk status typing
    this.client.on('message_create', async (msg) => {
      if (msg.from === 'status@broadcast') return;
      
      if (msg.isStatus) {
        this.botStats.whatsappStatus = 'typing';
        // Simpan status typing ke database
        await this.saveWhatsAppStatusToDatabase('typing');
        
        // Reset status setelah 3 detik
        setTimeout(async () => {
          this.botStats.whatsappStatus = 'online';
          await this.saveWhatsAppStatusToDatabase('online');
        }, 3000);
      }
    });

    // Event listener untuk status recording
    this.client.on('message_revoke_everyone', async (after, before) => {
      if (before && before.hasMedia) {
        this.botStats.whatsappStatus = 'recording';
        // Simpan status recording ke database
        await this.saveWhatsAppStatusToDatabase('recording');
        
        // Reset status setelah 3 detik
        setTimeout(async () => {
          this.botStats.whatsappStatus = 'online';
          await this.saveWhatsAppStatusToDatabase('online');
        }, 3000);
      }
    });

    this.client.initialize();
  }

  async handleMessage(message) {
    try {
      this.botStats.messagesReceived++;
      
      const sender = message.from;
      const userId = sender.replace(/\D/g, '');
      const content = message.body.trim();
      const isGroup = sender.includes('@g.us');
      
      // Skip if from status or other special chats
      if (sender === 'status@broadcast') return;
      
      // Maintenance mode check
      if (this.maintenanceMode && !BotUtils.isAdmin(sender)) {
        await message.reply('🔧 Bot sedang dalam maintenance. Silakan coba lagi nanti.');
        return;
      }
      
      // Jika ini adalah pesan pertama setelah bot dimulai, ambil nomor admin
      if (this.adminNumbers.length === 0) {
        await this.loadAdminNumbers();
      }
      
      // Rate limiting
      if (this.rateLimitManager.isRateLimited(userId)) {
        await message.reply(`⚠️ Anda mengirim pesan terlalu cepat! Sisa request: ${this.rateLimitManager.getRemainingRequests(userId)}`);
        return;
      }
      
      // Create or update user
      let user = await this.database.getUser(userId);
      if (!user) {
        await this.database.createUser(userId, message._data.notifyName);
        user = await this.database.getUser(userId);
      }
      
      // Kirim pesan selamat datang untuk pengguna baru
      if (!user.name && message._data.notifyName) {
        await message.reply('🎉 *SELAMAT DATANG*\n\nKetik !menu untuk melihat daftar perintah.');
        return;
      }
      
      // Tidak ada batasan penggunaan - semua pengguna memiliki akses unlimited
      
      // Kode untuk menambahkan pengguna baru sudah ditangani di atas
      
      // Update user activity
      await this.database.updateUser(userId, {
        last_activity: new Date().toISOString(),
        total_messages: (user.total_messages || 0) + 1
      });
      
      // Update active users
      this.activeUsers[userId] = {
        lastActivity: Date.now(),
        messageCount: (this.activeUsers[userId]?.messageCount || 0) + 1
      };
      
      // Log message
      await this.database.logMessage(userId, 'text', content.substring(0, 500));
      await this.database.updateStats();
      
      // Handle sticker creation from media
      if (message.hasMedia && (content.toLowerCase().includes('stiker') || content.toLowerCase().includes('sticker'))) {
        const command = this.commandRegistry.get('stiker');
        if (command) {
          await command.handler(message, []);
          return;
        }
      }
      
      // Handle commands
      if (content.startsWith(CONFIG.PREFIX)) {
        await this.handleCommand(message);
      } else {
        // Handle normal chat as AI conversation
        await this.handleAIChat(message);
      }
      
    } catch (error) {
      console.error('Error handling message:', error);
      this.botStats.errors++;
      await message.reply('❌ Terjadi kesalahan sistem. Tim kami sedang memperbaikinya.');
    }
  }

  async handleCommand(message) {
    const content = message.body.trim();
    const args = content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = this.commandRegistry.get(commandName);
    
    if (!command) {
      await message.reply(`❌ Perintah "${commandName}" tidak ditemukan!\nKetik ${CONFIG.PREFIX}menu untuk melihat semua perintah.`);
      return;
    }
    
    // Check admin permissions
    if (command.adminOnly && !BotUtils.isAdmin(message.from)) {
      await message.reply('⛔ Perintah ini hanya untuk admin!');
      return;
    }
    
    // Tidak ada batasan premium - semua pengguna memiliki akses ke semua perintah
    const userId = message.from.replace(/\D/g, '');
    const user = await this.database.getUser(userId);
    
    // Tambahkan command info untuk melihat status penggunaan
    if (commandName === 'info' || commandName === 'status') {
      try {
        const totalMessages = user?.total_messages || 0;
        const totalCommands = user?.total_commands || 0;
        const joinDate = user?.join_date ? new Date(user.join_date).toLocaleDateString('id-ID') : 'Tidak diketahui';
        
        let memberStatus = 'Pengguna';
        if (BotUtils.isAdmin(message.from)) {
          memberStatus = 'Admin';
        }
        
        const infoMessage = `📊 *INFORMASI PENGGUNA*\n\n` +
                          `*Nama:* ${user?.name || 'Tidak diketahui'}\n` +
                          `*Status:* ${memberStatus}\n` +
                          `*Penggunaan:* Tidak terbatas\n\n` +
                          `*Statistik Penggunaan:*\n` +
                          `- Total Pesan: ${totalMessages}\n` +
                          `- Total Perintah: ${totalCommands}\n` +
                          `- Bergabung Sejak: ${joinDate}`;
        
        await message.reply(infoMessage);
        return;
      } catch (error) {
        console.error('Error getting user info:', error);
        await message.reply('❌ Terjadi kesalahan saat mengambil informasi pengguna.');
        return;
      }
    }
    
    // Command untuk melihat paket membership
    if (commandName === 'paket' || commandName === 'membership') {
      const premiumMessage = `✅ Akses ke semua fitur\n` +
                           `✅ Prioritas respons\n` +
                           `✅ Dukungan prioritas\n\n` +
                           `*Tipe Membership:*\n` +
                           `🔹 Free: 10 pesan/hari - Gratis\n` +
                           `⭐ Basic: 50 pesan/hari - Rp 50.000/bulan\n` +
                           `✨ Premium: 200 pesan/hari - Rp 120.000/bulan\n` +
                           `💎 Platinum: 500 pesan/hari - Rp 250.000/bulan\n` +
                           `🌟 Unlimited: Tanpa batas - Rp 400.000/bulan\n\n` +
                           `Untuk berlangganan, silakan hubungi admin.`;
      
      await message.reply(premiumMessage);
      return;
    }
    
    // Command untuk admin menambahkan atau memperpanjang langganan premium (sistem lama)
    if ((commandName === 'addpremium' || commandName === 'setpremium') && BotUtils.isAdmin(message.from)) {
      // Peringatan untuk menggunakan sistem baru
      await message.reply('⚠️ Command ini menggunakan sistem lama. Silakan gunakan !setmembership untuk mengatur membership dengan sistem baru.\n\nContoh:\n!setmembership 628123456789 premium 3m');
      
      // Format: !addpremium 628123456789 1m/3m/1y
      if (args.length < 2) {
        await message.reply('❌ Format salah!\nGunakan: !addpremium [nomor] [durasi]\n\nContoh:\n!addpremium 628123456789 1m\n\nDurasi: 1m (1 bulan), 3m (3 bulan), 1y (1 tahun)');
        return;
      }
      
      try {
        // Parse nomor telepon
        let phone = args[0];
        if (phone.startsWith('0')) {
          phone = '62' + phone.substring(1);
        }
        if (!phone.startsWith('62')) {
          phone = '62' + phone;
        }
        
        // Parse durasi
        const duration = args[1].toLowerCase();
        let months = 0;
        
        if (duration === '1m') {
          months = 1;
        } else if (duration === '3m') {
          months = 3;
        } else if (duration === '1y' || duration === '12m') {
          months = 12;
        } else {
          await message.reply('❌ Durasi tidak valid!\nGunakan: 1m (1 bulan), 3m (3 bulan), 1y (1 tahun)');
          return;
        }
        
        // Cek apakah user ada di database
        let targetUser = await this.database.getUser(phone);
        if (!targetUser) {
          await message.reply(`❌ User dengan nomor ${phone} tidak ditemukan di database.`);
          return;
        }
        
        // Hitung tanggal kedaluwarsa
        let expiryDate;
        if (targetUser.is_premium && targetUser.premium_expires) {
          // Jika sudah premium, perpanjang dari tanggal kedaluwarsa saat ini
          const currentExpiry = new Date(targetUser.premium_expires);
          expiryDate = new Date(currentExpiry);
          expiryDate.setMonth(expiryDate.getMonth() + months);
        } else {
          // Jika belum premium, mulai dari hari ini
          expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + months);
        }
        
        // Format tanggal untuk database
        const formattedExpiry = expiryDate.toISOString().split('T')[0];
        
        // Update user menjadi premium
        await this.database.updateUser(phone, {
          is_premium: 1,
          premium_expires: formattedExpiry,
          credits: 999999 // Set credits tinggi untuk user premium
        });
        
        // Kirim notifikasi ke admin
        await message.reply(`✅ Berhasil menambahkan premium untuk ${phone} sampai ${expiryDate.toLocaleDateString('id-ID')}.`);
        
        // Kirim notifikasi ke user
        const formattedPhone = phone + '@c.us';
        const premiumNotification = `🌟 *PREMIUM AKTIF*\n\n` +
                                  `Selamat! Akun Anda telah diaktifkan sebagai *User Premium* selama ${months} bulan.\n\n` +
                                  `*Masa Aktif:* Hingga ${expiryDate.toLocaleDateString('id-ID')}\n\n` +
                                  `Nikmati semua fitur premium tanpa batasan!\n` +
                                  `Terima kasih telah berlangganan.`;
        
        await this.client.sendMessage(formattedPhone, premiumNotification);
        
      } catch (error) {
        console.error('Error adding premium:', error);
        await message.reply('❌ Terjadi kesalahan saat menambahkan premium.');
      }
      return;
    }
    
    // Semua perintah terkait premium dan membership telah dihapus
        const premiumExpires = targetUser.premium_expires ? new Date(targetUser.premium_expires).toLocaleDateString('id-ID') : 'Tidak berlangganan';
        const credits = targetUser.credits || 0;
        
        const statusMessage = `📊 *STATUS PREMIUM (SISTEM LAMA)*\n\n` +
                            `*Nomor:* ${phone}\n` +
                            `*Nama:* ${targetUser.name || 'Tidak diketahui'}\n` +
                            `*Premium:* ${isPremium ? '✅ Ya' : '❌ Tidak'}\n` +
                            `*Berlangganan Sampai:* ${isPremium ? premiumExpires : '-'}\n` +
                            `*Sisa Penggunaan:* ${isPremium ? 'Tidak terbatas' : credits + ' pesan'}\n\n` +
                            `Untuk menambah premium (sistem baru):\n!setmembership ${phone} [tipe] [durasi]`;
        
        await message.reply(statusMessage);
      } catch (error) {
        console.error('Error checking premium:', error);
        await message.reply('❌ Terjadi kesalahan saat memeriksa status premium.');
      }
      return;
    }
    
    // Command untuk admin mengatur membership
    if (commandName === 'setmembership' && BotUtils.isAdmin(message.from)) {
      if (args.length < 3) {
        await message.reply('❌ Format salah!\nGunakan: !setmembership [nomor] [tipe] [durasi]\n\nContoh:\n!setmembership 628123456789 premium 3m\n\nTipe: free, basic, premium, platinum, unlimited\nDurasi: 1m (1 bulan), 3m (3 bulan), 6m (6 bulan), 1y (1 tahun)');
        return;
      }
      
      try {
        // Kode terkait membership telah dihapus
        await message.reply('✅ Sistem membership telah dihapus. Semua pengguna memiliki akses unlimited.');
        return;
        
                                     `Selamat! Akun Anda telah diaktifkan sebagai *Member ${membershipTypeName}* selama ${months} bulan.\n\n` +
                                     `*Tipe Membership:* ${membershipBadge} ${membershipTypeName}\n` +
                                     `*Masa Aktif:* Hingga ${expiryDate.toLocaleDateString('id-ID')}\n` +
                                     `*Credits:* ${credits} pesan\n\n` +
                                     `Nikmati semua fitur membership ${membershipTypeName}!\n` +
                                     `Terima kasih telah berlangganan.`;
        
        await this.client.sendMessage(formattedPhone, membershipNotification);
        
      } catch (error) {
        console.error('Error setting membership:', error);
        await message.reply('❌ Terjadi kesalahan saat mengatur membership.');
      }
      return;
    }
    
    // Command untuk admin mengaktifkan paket
    if (commandName === 'aktivasi' && BotUtils.isAdmin(message.from)) {
      if (args.length < 1) {
        await message.reply('❌ Format salah!\nGunakan: !aktivasi [id_transaksi]\n\nContoh:\n!aktivasi 123');
        return;
      }
      
      try {
        const transactionId = parseInt(args[0]);
        if (isNaN(transactionId)) {
          await message.reply('❌ ID transaksi tidak valid. Masukkan angka.');
          return;
        }
        
        // Cek apakah transaksi ada
        const transaction = await this.transactionManager.getTransactionById(transactionId);
        if (!transaction) {
          await message.reply(`❌ Transaksi dengan ID ${transactionId} tidak ditemukan.`);
          return;
        }
        
        // Cek apakah transaksi sudah diproses
        if (transaction.status !== 'pending') {
          await message.reply(`❌ Transaksi dengan ID ${transactionId} sudah diproses sebelumnya (${transaction.status}).`);
          return;
        }
        
        // Cek apakah member ada
        const member = await this.memberManager.getMemberById(transaction.member_id);
        if (!member) {
          await message.reply(`❌ Member dengan ID ${transaction.member_id} tidak ditemukan.`);
          return;
        }
        
        // Hitung tanggal kadaluarsa berdasarkan durasi
        const expiryDate = new Date();
        let months = 0;
        
        if (transaction.duration === '1m') {
          months = 1;
        } else if (transaction.duration === '3m') {
          months = 3;
        } else if (transaction.duration === '6m') {
          months = 6;
        } else if (transaction.duration === '1y' || transaction.duration === '12m') {
          months = 12;
        }
        
        expiryDate.setMonth(expiryDate.getMonth() + months);
        const formattedExpiry = expiryDate.toISOString();
        
        // Set credits berdasarkan tipe paket
        let credits = 10; // Default untuk free
        switch (transaction.package_type) {
          case 'basic':
            credits = 100;
            break;
          case 'premium':
            credits = 300;
            break;
          case 'platinum':
            credits = 500;
            break;
          case 'unlimited':
            credits = 999999;
            break;
        }
        
        // Update membership
        await this.memberManager.updateMember(member.id, {
          membership_type: transaction.package_type,
          membership_expires: formattedExpiry,
          credits: credits
        });
        
        // Update status transaksi
        const adminNumber = message.from.replace(/\D/g, '');
        await this.transactionManager.approveTransaction(transactionId, adminNumber);
        
        // Format tipe membership untuk notifikasi
        let membershipTypeName = '';
        let membershipBadge = '';
        switch (transaction.package_type) {
          case 'unlimited':
            membershipTypeName = 'Unlimited';
            membershipBadge = '🔰';
            break;
          case 'platinum':
            membershipTypeName = 'Platinum';
            membershipBadge = '💎';
            break;
          case 'premium':
            membershipTypeName = 'Premium';
            membershipBadge = '✨';
            break;
          case 'basic':
            membershipTypeName = 'Basic';
            membershipBadge = '⭐';
            break;
          default:
            membershipTypeName = 'Free';
            membershipBadge = '🔹';
        }
        
        // Kirim notifikasi ke admin
        await message.reply(`✅ Berhasil mengaktifkan paket ${membershipTypeName} untuk ${member.phone} sampai ${expiryDate.toLocaleDateString('id-ID')}.`);
        
        // Kirim notifikasi ke user
        const formattedPhone = member.phone + '@c.us';
        const membershipNotification = `${membershipBadge} *MEMBERSHIP ${membershipTypeName.toUpperCase()} AKTIF*\n\n` +
                                     `Selamat! Pembayaran Anda telah dikonfirmasi dan akun Anda telah diaktifkan sebagai *Member ${membershipTypeName}*.\n\n` +
                                     `*Tipe Membership:* ${membershipBadge} ${membershipTypeName}\n` +
                                     `*Masa Aktif:* Hingga ${expiryDate.toLocaleDateString('id-ID')}\n` +
                                     `*Credits:* ${credits} pesan\n\n` +
                                     `Nikmati semua fitur membership ${membershipTypeName}!\n` +
                                     `Terima kasih telah berlangganan.`;
        
        await this.client.sendMessage(formattedPhone, membershipNotification);
        
      } catch (error) {
        console.error('Error activating package:', error);
        await message.reply('❌ Terjadi kesalahan saat mengaktifkan paket.');
      }
      return;
    }
    
    // Command untuk transaksi telah dihapus - tidak ada lagi sistem membership
    if (commandName === 'transaksi' && BotUtils.isAdmin(message.from)) {
      await message.reply('✅ Sistem membership dan transaksi telah dihapus. Semua pengguna memiliki akses unlimited.');
      return;
              break;
            case '1y':
            case '12m':
              duration = '1 Tahun';
              break;
            default:
              duration = transaction.duration;
          }
          
          transactionList += `*ID:* #${transaction.id}\n`;
          transactionList += `*Pengguna:* ${memberPhone}\n`;
          transactionList += `*Paket:* ${packageType}\n`;
          transactionList += `*Durasi:* ${duration}\n`;
          transactionList += `*Harga:* Rp ${transaction.amount.toLocaleString('id-ID')}\n`;
          transactionList += `*Tanggal:* ${formattedDate}\n`;
          transactionList += `\n----------------------------\n\n`;
        }
        
        transactionList += `Untuk menyetujui: *!aktivasi [id_transaksi]*\n`;
        transactionList += `Untuk menolak: *!tolak [id_transaksi] [alasan]*`;
        
        await message.reply(transactionList);
      } catch (error) {
        console.error('Error getting transactions:', error);
        await message.reply('❌ Terjadi kesalahan saat mengambil daftar transaksi.');
      }
      return;
    }
    
    // Command untuk admin menolak pembelian paket
    if (commandName === 'tolak' && BotUtils.isAdmin(message.from)) {
      if (args.length < 1) {
        await message.reply('❌ Format salah!\nGunakan: !tolak [id_transaksi] [alasan]\n\nContoh:\n!tolak 123 Bukti pembayaran tidak valid');
        return;
      }
      
      try {
        const transactionId = parseInt(args[0]);
        if (isNaN(transactionId)) {
          await message.reply('❌ ID transaksi tidak valid. Masukkan angka.');
          return;
        }
        
        // Cek apakah transaksi ada
        const transaction = await this.transactionManager.getTransactionById(transactionId);
        if (!transaction) {
          await message.reply(`❌ Transaksi dengan ID ${transactionId} tidak ditemukan.`);
          return;
        }
        
        // Cek apakah transaksi sudah diproses
        if (transaction.status !== 'pending') {
          await message.reply(`❌ Transaksi dengan ID ${transactionId} sudah diproses sebelumnya (${transaction.status}).`);
          return;
        }
        
        // Cek apakah member ada
        const member = await this.memberManager.getMemberById(transaction.member_id);
        if (!member) {
          await message.reply(`❌ Member dengan ID ${transaction.member_id} tidak ditemukan.`);
          return;
        }
        
        // Ambil alasan penolakan jika ada
        const reason = args.slice(1).join(' ') || 'Tidak ada alasan yang diberikan';
        
        // Update status transaksi
        const adminNumber = message.from.replace(/\D/g, '');
        await this.transactionManager.rejectTransaction(transactionId, adminNumber, reason);
        
        // Kirim notifikasi ke admin
        await message.reply(`✅ Berhasil menolak transaksi ID ${transactionId}.`);
        
        // Kirim notifikasi ke user
        const formattedPhone = member.phone + '@c.us';
        const rejectionNotification = `❌ *PEMBAYARAN DITOLAK*\n\n` +
                                    `Mohon maaf, pembayaran Anda untuk pembelian paket telah ditolak.\n\n` +
                                    `*ID Transaksi:* #${transactionId}\n` +
                                    `*Alasan:* ${reason}\n\n` +
                                    `Silakan hubungi admin untuk informasi lebih lanjut atau coba lagi dengan melakukan pembelian baru.`;
        
        await this.client.sendMessage(formattedPhone, rejectionNotification);
        
      } catch (error) {
        console.error('Error rejecting transaction:', error);
        await message.reply('❌ Terjadi kesalahan saat menolak transaksi.');
      }
      return;
    }
    
    // Command untuk admin menambahkan credits
    if (commandName === 'addcredits' && BotUtils.isAdmin(message.from)) {
      if (args.length < 2) {
        await message.reply('❌ Format salah!\nGunakan: !addcredits [nomor] [jumlah]\n\nContoh:\n!addcredits 628123456789 50');
        return;
      }
      
      try {
        // Parse nomor telepon
        let phone = args[0];
        if (phone.startsWith('0')) {
          phone = '62' + phone.substring(1);
        }
        if (!phone.startsWith('62')) {
          phone = '62' + phone;
        }
        
        // Parse jumlah credits
        const creditsToAdd = parseInt(args[1]);
        if (isNaN(creditsToAdd) || creditsToAdd <= 0) {
          await message.reply('❌ Jumlah credits tidak valid. Masukkan angka positif.');
          return;
        }
        
        // Cek apakah member ada di database
        const member = await this.memberManager.getMemberByPhone(phone);
        if (!member) {
          await message.reply(`❌ Member dengan nomor ${phone} tidak ditemukan. Pastikan member sudah terdaftar.`);
          return;
        }
        
        // Tambahkan credits
        const currentCredits = member.credits || 0;
        const newCredits = currentCredits + creditsToAdd;
        await this.memberManager.updateCredits(member.id, newCredits);
        
        // Kirim notifikasi ke admin
        await message.reply(`✅ Berhasil menambahkan ${creditsToAdd} credits untuk ${phone}.\nTotal credits sekarang: ${newCredits}`);
        
        // Kirim notifikasi ke user
        const formattedPhone = phone + '@c.us';
        const creditsNotification = `💰 *CREDITS DITAMBAHKAN*\n\n` +
                                  `${creditsToAdd} credits telah ditambahkan ke akun Anda.\n\n` +
                                  `*Total Credits:* ${newCredits} pesan\n\n` +
                                  `Terima kasih telah menggunakan layanan kami.`;
        
        await this.client.sendMessage(formattedPhone, creditsNotification);
        
      } catch (error) {
        console.error('Error adding credits:', error);
        await message.reply('❌ Terjadi kesalahan saat menambahkan credits.');
      }
      return;
    }
    
    // Command untuk memeriksa status membership
    if (commandName === 'statuspremium' || commandName === 'statusmember' || commandName === 'membership') {
      try {
        // Cek apakah user adalah member
        const userId = message.from.replace(/\D/g, '');
        const member = await this.memberManager.getMemberByPhone(userId);
        
        if (!member || member.status !== 'approved') {
          await message.reply('❌ Anda belum terdaftar sebagai member atau pendaftaran Anda belum disetujui.\n\nKetik *daftar* untuk memulai proses pendaftaran.');
          return;
        }
        
        // Format tanggal kadaluarsa
        let expiryDate = 'Tidak terbatas';
        if (member.membership_expires) {
          expiryDate = new Date(member.membership_expires).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
        }
        
        // Format tipe membership
        let membershipType = '';
        let membershipBadge = '';
        switch (member.membership_type) {
          case 'unlimited':
            membershipType = 'Unlimited';
            membershipBadge = '🌟';
            break;
          case 'platinum':
            membershipType = 'Platinum';
            membershipBadge = '💎';
            break;
          case 'premium':
            membershipType = 'Premium';
            membershipBadge = '✨';
            break;
          case 'basic':
            membershipType = 'Basic';
            membershipBadge = '⭐';
            break;
          default:
            membershipType = 'Free';
            membershipBadge = '🔹';
        }
        
        // Buat pesan status
        const statusMessage = `${membershipBadge} *STATUS MEMBERSHIP*\n\n` +
                            `*Nama:* ${member.name}\n` +
                            `*Nomor:* ${member.phone}\n` +
                            `*Tipe Membership:* ${membershipBadge} ${membershipType}\n` +
                            `*Masa Aktif:* ${expiryDate}\n` +
                            `*Sisa Credits:* ${member.credits || 0} pesan\n\n` +
                            `Untuk upgrade membership, silakan hubungi admin.`;
        
        await message.reply(statusMessage);
      } catch (error) {
        console.error('Error checking membership status:', error);
        await message.reply('❌ Terjadi kesalahan saat memeriksa status membership.');
      }
      return;
    }
    
    try {
      this.botStats.commandsExecuted++;
      command.usage++;
      
      // Update user command count
      await this.database.updateUser(userId, {
        total_commands: (user.total_commands || 0) + 1
      });
      
      const startTime = Date.now();
      await command.handler(message, args);
      const responseTime = Date.now() - startTime;
      
      // Log command execution
      await this.database.logMessage(userId, 'command', content, commandName, null, responseTime);
      
    } catch (error) {
      console.error(`Command ${commandName} error:`, error);
      this.botStats.errors++;
      await message.reply(`❌ Terjadi kesalahan saat menjalankan perintah "${commandName}".`);
    }
  }

  async handleAIChat(message) {
    const content = message.body.trim();
    const userId = message.from.replace(/\D/g, '');
    
    // Skip short messages or obvious non-questions
    if (content.length < 3 || /^(ok|oke|yes|no|ya|tidak|👍|👎|😂|😊|😭)$/i.test(content)) {
      return;
    }
    
    try {
      const response = await this.aiManager.generateResponse(content, userId);
      await message.reply(`${response}`);
      
      this.botStats.messagesResponded++;
      
      // Log AI conversation
      await this.database.logMessage(userId, 'ai_chat', content, null, response.substring(0, 500));
      
    } catch (error) {
      console.error('AI chat error:', error);
      this.botStats.errors++;
      await message.reply('❌ Maaf, AI sedang mengalami gangguan. Silakan coba lagi nanti.');
    }
  }

  setupPeriodicTasks() {
    // Cleanup temp files every hour
    setInterval(() => {
      BotUtils.cleanupTempFiles();
    }, 3600000);
    
    // Reset daily credits at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('🔄 Resetting daily credits...');
      await new Promise(resolve => {
        this.database.db.run('UPDATE users SET credits = 10 WHERE is_premium = 0', resolve);
      });
    });
    
    // Auto backup daily at 2 AM
    cron.schedule('0 2 * * *', () => {
      console.log('💾 Running auto backup...');
      // Backup logic here
    });
    
    // Update statistics every minute
    setInterval(async () => {
      const date = new Date().toISOString().split('T')[0];
      await this.database.updateStats(date);
    }, 60000);
    
    // Pemeriksaan pendaftaran member yang belum disetujui dihapus karena tidak diperlukan lagi
  }
  
  async loadAdminNumbers() {
    try {
      const admins = await this.database.getAllAdmins();
      this.adminNumbers = admins.map(admin => admin.phone);
      console.log(`📱 Loaded ${this.adminNumbers.length} admin numbers`);
    } catch (error) {
      console.error('Error loading admin numbers:', error);
    }
  }
  
  // Fungsi notifikasi pendaftaran dihapus karena tidak diperlukan lagi
  
  async sendAdminNotification(message) {
    try {
      // Pastikan admin numbers sudah diload
      if (this.adminNumbers.length === 0) {
        await this.loadAdminNumbers();
      }
      
      // Kirim notifikasi ke semua admin
      for (const adminPhone of this.adminNumbers) {
        // Format nomor telepon untuk WhatsApp
        let phone = adminPhone;
        if (!phone.includes('@c.us')) {
          // Pastikan format nomor telepon benar
          if (phone.startsWith('0')) {
            phone = '62' + phone.substring(1);
          }
          if (!phone.startsWith('62')) {
            phone = '62' + phone;
          }
          phone = phone + '@c.us';
        }
        
        await this.client.sendMessage(phone, message);
        console.log(`📱 Sent admin notification to ${phone}`);
      }
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  }

  setupWebDashboard() {
    const app = express();
    
    app.use(cors());
    app.use(bodyParser.json());
    app.use(session({
      secret: CONFIG.JWT_SECRET,
      resave: false,
      saveUninitialized: true
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    });
    app.use(limiter);
    
    // Serve static files
    app.use(express.static('public'));
    
    // Dashboard routes
    app.get('/', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>${CONFIG.BOT_NAME} Dashboard</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
              .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { text-align: center; color: #333; margin-bottom: 30px; }
              .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
              .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
              .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
              .stat-label { opacity: 0.9; }
              .section { margin-bottom: 30px; }
              .section h3 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🤖 ${CONFIG.BOT_NAME} Dashboard</h1>
                <p>Real-time Bot Statistics & Management</p>
              </div>
              
              <div class="stats">
                <div class="stat-card">
                  <div class="stat-number" id="totalMessages">${this.botStats.messagesReceived}</div>
                  <div class="stat-label">Total Messages</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number" id="totalCommands">${this.botStats.commandsExecuted}</div>
                  <div class="stat-label">Commands Executed</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number" id="activeUsers">${Object.keys(this.activeUsers).length}</div>
                  <div class="stat-label">Active Users</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number" id="aiProvider">${this.aiManager.currentProvider}</div>
                  <div class="stat-label">AI Provider</div>
                </div>
              </div>
              
              <div class="section">
                <h3>📊 System Information</h3>
                <p><strong>Uptime:</strong> ${moment.duration(Date.now() - this.botStats.startTime).humanize()}</p>
                <p><strong>Memory Usage:</strong> ${BotUtils.formatFileSize(process.memoryUsage().rss)}</p>
                <p><strong>Available Commands:</strong> ${this.commandRegistry.commands.size}</p>
                <p><strong>Maintenance Mode:</strong> ${this.maintenanceMode ? 'ON' : 'OFF'}</p>
              </div>
              
              <div class="section">
                <h3>🔗 Quick Links</h3>
                <p><a href="/whatsapp-login" style="color: #0C6B61; font-weight: bold;">📱 WhatsApp Login</a></p>
                <p><a href="/api/stats">API Statistics</a></p>
                <p><a href="/api/commands">API Commands List</a></p>
                <p><a href="/api/users">API Users</a></p>
              </div>
            </div>
            
            <script>
              // Auto refresh every 30 seconds
              setInterval(() => {
                location.reload();
              }, 30000);
            </script>
          </body>
        </html>
      `);
    });
    
    // API endpoints
    app.get('/api/stats', async (req, res) => {
      try {
        // Ambil status WhatsApp dari database
        const whatsappStatusData = await this.getWhatsAppStatusFromDatabase();
        const whatsappStatus = whatsappStatusData ? whatsappStatusData.status : (this.botStats.whatsappStatus || 'offline');
        
        res.json({
          botStats: this.botStats,
          activeUsers: Object.keys(this.activeUsers).length,
          availableAI: this.aiManager.getAvailableProviders(),
          currentAI: this.aiManager.currentProvider,
          totalCommands: this.commandRegistry.commands.size,
          uptime: Date.now() - this.botStats.startTime,
          memoryUsage: process.memoryUsage(),
          maintenanceMode: this.maintenanceMode,
          whatsappStatus: whatsappStatus
        });
      } catch (error) {
        console.error('Error getting bot stats:', error);
        res.status(500).json({
          error: error.message
        });
      }
    });
    
    app.get('/api/commands', (req, res) => {
      res.json(this.commandRegistry.getAllCommands());
    });
    
    app.get('/api/users', async (req, res) => {
      try {
        const users = await new Promise((resolve, reject) => {
          this.database.db.all('SELECT phone, total_messages, total_commands, is_premium, join_date FROM users ORDER BY total_messages DESC LIMIT 50', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        res.json(users);
      } catch (error) {
        res.status(500).json({ error: 'Database error' });
      }
    });
    
    // Middleware untuk verifikasi token JWT
    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) return res.status(401).json({ success: false, message: 'Access token required' });
      
      jwt.verify(token, CONFIG.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        req.user = user;
        next();
      });
    };
    
    // Admin login endpoint
    app.post('/api/login', async (req, res) => {
      const { username, password } = req.body;
      
      try {
        const admin = await new Promise((resolve, reject) => {
          this.database.db.get('SELECT * FROM admins WHERE username = ?', [username], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        
        if (admin && await bcrypt.compare(password, admin.password_hash)) {
          const token = jwt.sign({ id: admin.id, username: admin.username }, CONFIG.JWT_SECRET);
          res.json({ success: true, token });
        } else {
          res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    // API endpoints untuk template pesan (gombalan, perkenalan, salam, dll)
    app.get('/api/templates', authenticateToken, async (req, res) => {
      try {
        const category = req.query.category;
        const templates = await this.templateManager.getMessageTemplates(category);
        res.json({ success: true, templates });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    app.get('/api/templates/:id', authenticateToken, async (req, res) => {
      try {
        const template = await this.templateManager.getMessageTemplateById(req.params.id);
        if (template) {
          res.json({ success: true, template });
        } else {
          res.status(404).json({ success: false, message: 'Template not found' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    app.post('/api/templates', authenticateToken, async (req, res) => {
      try {
        const { category, title, content } = req.body;
        
        if (!category || !title || !content) {
          return res.status(400).json({ success: false, message: 'Category, title and content are required' });
        }
        
        const template = {
          category,
          title,
          content,
          created_by: req.user.username
        };
        
        const result = await this.templateManager.addMessageTemplate(template);
        res.json({ success: true, id: result.id });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    app.put('/api/templates/:id', authenticateToken, async (req, res) => {
      try {
        const { category, title, content } = req.body;
        
        if (!category || !title || !content) {
          return res.status(400).json({ success: false, message: 'Category, title and content are required' });
        }
        
        const template = {
          category,
          title,
          content
        };
        
        const result = await this.templateManager.updateMessageTemplate(req.params.id, template);
        
        if (result.changes > 0) {
          res.json({ success: true });
        } else {
          res.status(404).json({ success: false, message: 'Template not found or no changes made' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
      try {
        const result = await this.templateManager.deleteMessageTemplate(req.params.id);
        
        if (result.changes > 0) {
          res.json({ success: true });
        } else {
          res.status(404).json({ success: false, message: 'Template not found' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    // API endpoints untuk pengaturan
    app.get('/api/settings', authenticateToken, async (req, res) => {
      try {
        // Ambil pengaturan dari database atau dari bot
        const settings = {
          maintenanceMode: this.maintenanceMode,
          aiProvider: this.aiManager ? this.aiManager.provider : 'none',
          commandPrefix: this.commandRegistry ? this.commandRegistry.prefix : '!',
          whatsappStatus: this.botStats.whatsappStatus || 'offline',
          whatsappHeadless: CONFIG.WHATSAPP_HEADLESS,
          whatsappQrTimeout: CONFIG.WHATSAPP_QR_TIMEOUT,
          whatsappReconnectAttempts: CONFIG.WHATSAPP_RECONNECT_ATTEMPTS
        };
        
        res.json({ success: true, settings });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    app.post('/api/settings', authenticateToken, async (req, res) => {
      try {
        const { 
          maintenanceMode, 
          aiProvider, 
          commandPrefix,
          whatsappHeadless,
          whatsappQrTimeout,
          whatsappReconnectAttempts
        } = req.body;
        
        // Update pengaturan
        if (maintenanceMode !== undefined) {
          this.maintenanceMode = maintenanceMode;
        }
        
        if (aiProvider && this.aiManager) {
          this.aiManager.provider = aiProvider;
        }
        
        if (commandPrefix && this.commandRegistry) {
          this.commandRegistry.prefix = commandPrefix;
        }
        
        // Update pengaturan WhatsApp
        let whatsappSettingsChanged = false;
        
        if (whatsappHeadless !== undefined) {
          CONFIG.WHATSAPP_HEADLESS = whatsappHeadless;
          whatsappSettingsChanged = true;
        }
        
        if (whatsappQrTimeout !== undefined) {
          CONFIG.WHATSAPP_QR_TIMEOUT = whatsappQrTimeout;
          whatsappSettingsChanged = true;
        }
        
        if (whatsappReconnectAttempts !== undefined) {
          CONFIG.WHATSAPP_RECONNECT_ATTEMPTS = whatsappReconnectAttempts;
          whatsappSettingsChanged = true;
        }
        
        // Jika pengaturan WhatsApp berubah, simpan ke file .env atau database
        if (whatsappSettingsChanged) {
          // Untuk implementasi sederhana, kita hanya log perubahan
          console.log('WhatsApp settings updated:', {
            headless: CONFIG.WHATSAPP_HEADLESS,
            qrTimeout: CONFIG.WHATSAPP_QR_TIMEOUT,
            reconnectAttempts: CONFIG.WHATSAPP_RECONNECT_ATTEMPTS
          });
          
          // Untuk implementasi lengkap, kita bisa menyimpan ke file .env atau database
          // fs.writeFileSync('.env', `WHATSAPP_HEADLESS=${CONFIG.WHATSAPP_HEADLESS}\nWHATSAPP_QR_TIMEOUT=${CONFIG.WHATSAPP_QR_TIMEOUT}\nWHATSAPP_RECONNECT_ATTEMPTS=${CONFIG.WHATSAPP_RECONNECT_ATTEMPTS}`);
        }
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    // API endpoints untuk manajemen member
    app.get('/api/members', authenticateToken, async (req, res) => {
      try {
        const status = req.query.status;
        const members = await this.memberManager.getMembers(status);
        res.json({ success: true, members });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    // Endpoint untuk mendapatkan jumlah member pending
    // PENTING: Harus ditempatkan sebelum endpoint dengan parameter dinamis /:id
    app.get('/api/members/pending/count', authenticateToken, async (req, res) => {
      try {
        const count = await this.memberManager.getPendingMembersCount();
        res.json({ success: true, count });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    app.get('/api/members/:id', authenticateToken, async (req, res) => {
      try {
        const member = await this.memberManager.getMemberById(req.params.id);
        if (member) {
          res.json({ success: true, member });
        } else {
          res.status(404).json({ success: false, message: 'Member not found' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    app.post('/api/members', async (req, res) => {
      try {
        const { phone, name, email, notes } = req.body;
        
        if (!phone || !name) {
          return res.status(400).json({ success: false, message: 'Phone and name are required' });
        }
        
        // Cek apakah nomor telepon sudah terdaftar
        const existingMember = await this.memberManager.getMemberByPhone(phone);
        if (existingMember) {
          return res.status(400).json({ success: false, message: 'Phone number already registered' });
        }
        
        const member = {
          phone,
          name,
          email,
          notes,
          status: 'approved',
          membership_type: 'free'
        };
        
        const result = await this.memberManager.addMember(member);
        
        // Tambahkan 50 kredit
        if (result && result.id) {
          await this.memberManager.updateCredits(result.id, 50);
        }
        
        res.json({ success: true, id: result.id, message: 'Registration successful. You have 50 free messages.' });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    app.put('/api/members/:id', authenticateToken, async (req, res) => {
      try {
        const { phone, name, email, notes } = req.body;
        
        if (!phone || !name) {
          return res.status(400).json({ success: false, message: 'Phone and name are required' });
        }
        
        const member = {
          phone,
          name,
          email,
          notes
        };
        
        const result = await this.memberManager.updateMember(req.params.id, member);
        
        if (result.changes > 0) {
          res.json({ success: true });
        } else {
          res.status(404).json({ success: false, message: 'Member not found or no changes made' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    // Endpoint persetujuan dan penolakan member dihapus karena tidak diperlukan lagi
    
    app.post('/api/members/:id/update-membership', authenticateToken, async (req, res) => {
      try {
        const memberId = req.params.id;
        const { membership_type, credits } = req.body;
        
        const member = await this.memberManager.getMemberById(memberId);
        if (!member) {
          return res.status(404).json({ success: false, message: 'Member not found' });
        }
        
        // Update membership type jika ada
        if (membership_type) {
          await this.memberManager.updateMembershipType(memberId, membership_type);
        }
        
        // Update credits jika ada
        if (credits !== undefined) {
          await this.memberManager.updateCredits(memberId, credits);
        }
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    app.post('/api/members/:id/delete', authenticateToken, async (req, res) => {
      try {
        const memberId = req.params.id;
        
        const member = await this.memberManager.getMemberById(memberId);
        if (!member) {
          return res.status(404).json({ success: false, message: 'Member not found' });
        }
        
        const result = await this.memberManager.deleteMember(memberId);
        
        if (result.changes > 0) {
          res.json({ success: true });
        } else {
          res.status(404).json({ success: false, message: 'Member not found or no changes made' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    app.delete('/api/members/:id', authenticateToken, async (req, res) => {
      try {
        const result = await this.memberManager.deleteMember(req.params.id);
        
        if (result.changes > 0) {
          res.json({ success: true });
        } else {
          res.status(404).json({ success: false, message: 'Member not found' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
    
    // Endpoint untuk mendapatkan jumlah member pending sudah dipindahkan ke atas
    
    // Endpoint untuk WhatsApp Login
    app.get('/whatsapp-login', (req, res) => {
      // Menggunakan file HTML yang terpisah untuk WhatsApp Manager
      res.sendFile(path.join(__dirname, 'public', 'whatsapp-login.html'));
      
      // Jika QR code tersedia, kirim ke client melalui API
      if (this.lastQR) {
        // QR code akan diambil oleh client melalui API
        // Lihat implementasi di whatsapp-login.html
      }
    });
    
    // Endpoint untuk refresh QR code
    app.get('/whatsapp-login/refresh', (req, res) => {
      try {
        // Reset client untuk mendapatkan QR code baru
        this.client.resetState();
        
        // Redirect kembali ke halaman login
        res.redirect('/whatsapp-login');
      } catch (error) {
        res.status(500).send(`<html><body><h1>Error</h1><p>${error.message}</p><a href="/whatsapp-login">Kembali</a></body></html>`);
      }
    });
    
    // Endpoint untuk logout WhatsApp
    app.get('/whatsapp-login/logout', authenticateToken, async (req, res) => {
      try {
        // Logout dari WhatsApp
        await this.client.logout();
        
        // Redirect kembali ke halaman login
        res.redirect('/whatsapp-login');
      } catch (error) {
        res.status(500).send(`<html><body><h1>Error</h1><p>${error.message}</p><a href="/whatsapp-login">Kembali</a></body></html>`);
      }
    });
    
    // Endpoint untuk restart WhatsApp client
    app.get('/whatsapp-login/restart', authenticateToken, async (req, res) => {
      try {
        // Restart WhatsApp client
        await this.client.destroy();
        setTimeout(() => {
          this.initClient();
        }, 1000);
        
        // Redirect kembali ke halaman login
        res.redirect('/whatsapp-login');
      } catch (error) {
        res.status(500).send(`<html><body><h1>Error</h1><p>${error.message}</p><a href="/whatsapp-login">Kembali</a></body></html>`);
      }
    });
    
    // Endpoint untuk reset sesi WhatsApp
    app.get('/whatsapp-login/reset', authenticateToken, async (req, res) => {
      try {
        // Destroy client terlebih dahulu
        await this.client.destroy();
        
        // Hapus data sesi WhatsApp
        const fs = require('fs');
        const path = require('path');
        const authDataPath = path.join(process.cwd(), 'auth_data');
        
        if (fs.existsSync(authDataPath)) {
          // Hapus folder auth_data secara rekursif
          const rimraf = require('rimraf');
          rimraf.sync(authDataPath);
          console.log('WhatsApp session data has been deleted');
        }
        
        // Inisialisasi ulang client setelah menghapus data
        setTimeout(() => {
          this.initClient();
        }, 1000);
        
        // Redirect kembali ke halaman login
        res.redirect('/whatsapp-login');
      } catch (error) {
        console.error('Error resetting WhatsApp session:', error);
        res.status(500).send(`<html><body><h1>Error</h1><p>${error.message}</p><a href="/whatsapp-login">Kembali</a></body></html>`);
      }
    });
    
    // API Endpoint untuk mendapatkan QR code
    app.get('/api/whatsapp/qr', authenticateToken, async (req, res) => {
      try {
        // Ambil QR code dari database
        const statusData = await this.getWhatsAppStatusFromDatabase();
        
        if (statusData && statusData.qr_code) {
          res.json({
            success: true,
            qrCode: statusData.qr_code,
            qrImageUrl: statusData.qr_image_url || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(statusData.qr_code)}`
          });
        } else if (this.lastQR) {
          // Fallback ke lastQR jika tidak ada di database
          res.json({
            success: true,
            qrCode: this.lastQR,
            qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(this.lastQR)}`
          });
        } else {
          res.json({
            success: false,
            message: 'QR code belum tersedia. Silakan refresh.'
          });
        }
      } catch (error) {
        console.error('Error getting WhatsApp QR code:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
    
    // API Endpoint untuk mendapatkan pengaturan WhatsApp
    app.get('/api/whatsapp/settings', authenticateToken, async (req, res) => {
      try {
        // Ambil pengaturan dari database
        const headlessSetting = await this.database.db.get('SELECT value FROM bot_settings WHERE key = ?', ['whatsapp_headless']);
        const qrTimeoutSetting = await this.database.db.get('SELECT value FROM bot_settings WHERE key = ?', ['whatsapp_qr_timeout']);
        const reconnectAttemptsSetting = await this.database.db.get('SELECT value FROM bot_settings WHERE key = ?', ['whatsapp_reconnect_attempts']);
        
        // Gunakan nilai dari database jika ada, jika tidak gunakan nilai dari CONFIG
        const headless = headlessSetting ? headlessSetting.value === 'true' : CONFIG.WHATSAPP_HEADLESS;
        const qrTimeout = qrTimeoutSetting ? parseInt(qrTimeoutSetting.value) : CONFIG.WHATSAPP_QR_TIMEOUT;
        const reconnectAttempts = reconnectAttemptsSetting ? parseInt(reconnectAttemptsSetting.value) : CONFIG.WHATSAPP_RECONNECT_ATTEMPTS;
        
        res.json({
          success: true,
          settings: {
            headless,
            qrTimeout,
            reconnectAttempts
          }
        });
      } catch (error) {
        console.error('Error getting WhatsApp settings:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
    
    // API Endpoint untuk menyimpan pengaturan WhatsApp
    app.post('/api/whatsapp/settings', authenticateToken, async (req, res) => {
      try {
        const { headless, qrTimeout, reconnectAttempts } = req.body;
        
        // Validasi input
        if (headless !== undefined) {
          CONFIG.WHATSAPP_HEADLESS = Boolean(headless);
          // Simpan ke database
          await this.database.db.run(
            'INSERT OR REPLACE INTO bot_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            ['whatsapp_headless', CONFIG.WHATSAPP_HEADLESS.toString()]
          );
        }
        
        if (qrTimeout !== undefined && !isNaN(qrTimeout)) {
          CONFIG.WHATSAPP_QR_TIMEOUT = parseInt(qrTimeout);
          // Simpan ke database
          await this.database.db.run(
            'INSERT OR REPLACE INTO bot_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            ['whatsapp_qr_timeout', CONFIG.WHATSAPP_QR_TIMEOUT.toString()]
          );
        }
        
        if (reconnectAttempts !== undefined && !isNaN(reconnectAttempts)) {
          CONFIG.WHATSAPP_RECONNECT_ATTEMPTS = parseInt(reconnectAttempts);
          // Simpan ke database
          await this.database.db.run(
            'INSERT OR REPLACE INTO bot_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            ['whatsapp_reconnect_attempts', CONFIG.WHATSAPP_RECONNECT_ATTEMPTS.toString()]
          );
        }
        
        res.json({
          success: true,
          message: 'Pengaturan WhatsApp berhasil disimpan ke database',
          settings: {
            headless: CONFIG.WHATSAPP_HEADLESS,
            qrTimeout: CONFIG.WHATSAPP_QR_TIMEOUT,
            reconnectAttempts: CONFIG.WHATSAPP_RECONNECT_ATTEMPTS
          }
        });
      } catch (error) {
        console.error('Error saving WhatsApp settings:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
    
    app.listen(CONFIG.WEB_PORT, CONFIG.WEB_HOST, () => {
      console.log(`🌐 Web dashboard running at http://${CONFIG.WEB_HOST}:${CONFIG.WEB_PORT}`);
    });
  }
}

// ========================================
// GLOBAL VARIABLES
// ========================================

let bot;
let database;
let aiManager;
let commandRegistry;
let rateLimitManager;
let botStats;
let activeUsers;
let maintenanceMode;
let client; // Make client global for command access

// ========================================
// INITIALIZE BOT
// ========================================

async function initBot() {
  try {
    console.log('🚀 Starting WhatsApp AI Bot...');
    console.log(`📋 Bot Name: ${CONFIG.BOT_NAME}`);
    console.log(`📦 Version: ${CONFIG.BOT_VERSION}`);
    console.log('⚙️ Initializing components...');
    
    bot = new WhatsAppBot();
    
    // Make variables globally accessible
    database = bot.database;
    aiManager = bot.aiManager;
    commandRegistry = bot.commandRegistry;
    rateLimitManager = bot.rateLimitManager;
    botStats = bot.botStats;
    activeUsers = bot.activeUsers;
    maintenanceMode = bot.maintenanceMode;
    client = bot.client;
    
    console.log('✅ Bot initialized successfully!');
    console.log(`🌟 Features: ${commandRegistry.commands.size} commands available`);
    console.log(`🤖 AI Providers: ${aiManager.getAvailableProviders().join(', ')}`);
    console.log('📱 Waiting for WhatsApp connection...');
    
  } catch (error) {
    console.error('❌ Failed to initialize bot:', error);
    process.exit(1);
  }
}

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  
  if (client) {
    await client.destroy();
  }
  
  if (database && database.db) {
    database.db.close();
  }
  
  console.log('✅ Bot shutdown completed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  
  if (client) {
    await client.destroy();
  }
  
  if (database && database.db) {
    database.db.close();
  }
  
  console.log('✅ Bot shutdown completed');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  if (botStats) botStats.errors++;
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
  if (botStats) botStats.errors++;
});

// ========================================
// START BOT
// ========================================

initBot();

// Export for testing purposes
module.exports = {
  CONFIG,
  Database,
  AIManager,
  BotUtils,
  MultimediaProcessor,
  CommandRegistry,
  WhatsAppBot
};

// ========================================
// END OF FILE - TOTAL: 3000+ LINES
// ========================================
