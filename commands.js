/**
 * File: commands.js
 * Deskripsi: Implementasi perintah-perintah tambahan untuk bot WhatsApp
 */

const CONFIG = require('./config');
// Gunakan BotUtils dari global scope karena didefinisikan di index.js
// const BotUtils = require('./utils/bot_utils');

/**
 * Mendaftarkan perintah-perintah tambahan ke dalam CommandRegistry
 * @param {Object} bot - Instance WhatsAppBot
 */
function registerAdditionalCommands(bot) {
  // Perintah untuk melihat informasi penggunaan (dimodifikasi - tanpa batasan)
  bot.commandRegistry.register('usage', 'info', 'Melihat informasi penggunaan akun',
    async (msg) => {
      try {
        const userId = msg.from.replace(/\D/g, '');
        const user = await bot.database.getUser(userId);
        
        const totalMessages = user?.total_messages || 0;
        const totalCommands = user?.total_commands || 0;
        const joinDate = user?.join_date ? new Date(user.join_date).toLocaleDateString('id-ID') : 'Tidak diketahui';
        
        const usageInfo = `📊 *INFORMASI PENGGUNAAN*\n\n` +
                        `🌟 *Status:* Unlimited\n` +
                        `💬 *Penggunaan:* Tidak terbatas\n\n` +
                        `*Statistik Penggunaan:*\n` +
                        `- Total Pesan: ${totalMessages}\n` +
                        `- Total Perintah: ${totalCommands}\n` +
                        `- Bergabung Sejak: ${joinDate}`;
        
        await msg.reply(usageInfo);
      } catch (error) {
        console.error('Error getting usage info:', error);
        await msg.reply('❌ Terjadi kesalahan saat mengambil informasi penggunaan.');
      }
    });

  // Perintah beli dihapus karena tidak ada lagi sistem membership

  // Semua perintah terkait membership dan transaksi telah dihapus

  // Semua perintah terkait membership dan transaksi telah dihapus
              

  // Menu langganan telah dihapus - semua pengguna memiliki akses unlimited
  bot.commandRegistry.register('langganan', '', 'Melihat informasi langganan', async (msg) => {
    await msg.reply('✅ Sistem membership telah dihapus. Semua pengguna memiliki akses unlimited.');
  });
}

module.exports = { registerAdditionalCommands };