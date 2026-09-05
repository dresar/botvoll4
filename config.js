// Mengekspor konfigurasi dari index.js

const CONFIG = {
  // Bot Settings
  PREFIX: process.env.PREFIX || '!',
  BOT_NAME: process.env.BOT_NAME || 'AI WhatsApp Bot Pro Max',
  BOT_VERSION: '3.0.0',
  MAX_DOWNLOAD_SIZE: 100, // MB
  MAX_MESSAGE_LENGTH: 4000,
  // Batasan penggunaan dihapus - semua pengguna memiliki akses unlimited
  
  // WhatsApp Settings
  WHATSAPP_HEADLESS: process.env.WHATSAPP_HEADLESS !== 'false', // Default true, set to 'false' untuk tampilkan browser
  WHATSAPP_QR_TIMEOUT: 60000, // 60 detik timeout untuk QR code
  WHATSAPP_RECONNECT_ATTEMPTS: 5, // Jumlah percobaan reconnect
  
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

module.exports = CONFIG;