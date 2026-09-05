/**
 * Dashboard Manager JavaScript
 * Handles dashboard functionality for the WhatsApp Bot
 */

class DashboardManager {
  constructor() {
    this.stats = {};
    this.navLinks = document.querySelectorAll('.nav-link');
    this.contentSections = document.querySelectorAll('.content-section');
    
    // Initialize dashboard
    this.init();
    
    // Check for pending members
    this.checkPendingMembers();
  }
  
  /**
   * Initialize the dashboard
   */
  init() {
    // Check if user is logged in
    this.checkAuth();
    
    // Setup navigation
    this.setupNavigation();
    
    // Setup logout
    this.setupLogout();
    
    // Load initial dashboard stats
    this.loadDashboardStats();
    
    // Setup refresh button
    document.getElementById('refreshStats')?.addEventListener('click', () => this.loadDashboardStats());
    
    // Check for pending members
    this.checkPendingMembers();
  }
  
  /**
   * Check if user is authenticated
   */
  checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login.html';
    } else {
      // Store token as authToken for WhatsApp API
      localStorage.setItem('authToken', token);
    }
  }
  
  /**
   * Setup navigation between sections
   */
  setupNavigation() {
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all links and sections
        this.navLinks.forEach(l => l.classList.remove('active'));
        this.contentSections.forEach(s => s.classList.remove('active'));
        
        // Add active class to clicked link
        link.classList.add('active');
        
        // Show corresponding section
        const sectionId = link.getAttribute('data-section');
        document.getElementById(sectionId).classList.add('active');
        
        // Load section data if needed
        if (sectionId === 'templates-section' && window.templateManager) {
          window.templateManager.loadTemplates();
        } else if (sectionId === 'settings-section' && window.settingsManager) {
          window.settingsManager.loadSettings();
        } else if (sectionId === 'dashboard-section') {
          this.loadDashboardStats();
        }
      });
    });
  }
  
  /**
   * Setup logout functionality
   */
  setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      window.location.href = '/login.html';
    });
  }
  
  /**
   * Load dashboard statistics
   */
  async loadDashboardStats() {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          window.location.href = 'login.html';
          return;
        }
        throw new Error('Failed to load stats');
      }
      
      const data = await response.json();
      
      // API mengembalikan data langsung, bukan dalam format {success: true, stats: {...}}
      this.stats = data;
      console.log('Stats loaded:', this.stats); // Debug log
      this.updateDashboardUI();
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }
  
  /**
   * Check for pending members
   */
  async checkPendingMembers() {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/members/pending/count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get pending count');
      }
      
      const data = await response.json();
      const pendingCount = data.count;
      
      const pendingNotification = document.getElementById('pending-notification');
      const pendingCountElement = document.getElementById('pending-count');
      
      if (pendingCount > 0) {
        pendingCountElement.textContent = pendingCount;
        pendingNotification.classList.remove('d-none');
      } else {
        pendingNotification.classList.add('d-none');
      }
    } catch (error) {
      console.error('Error checking pending members:', error);
    }
  }
  
  /**
   * Update dashboard UI with latest stats
   */
  updateDashboardUI() {
    console.log('Updating UI with stats:', this.stats); // Debug log
    
    // Update stat cards
    document.getElementById('totalMessages').textContent = this.stats.botStats?.messagesReceived || 0;
    document.getElementById('totalCommands').textContent = this.stats.totalCommands || 0;
    document.getElementById('activeUsers').textContent = this.stats.activeUsers || 0;
    document.getElementById('aiProvider').textContent = this.stats.currentAI || 'None';
    
    // Update WhatsApp status if available
    const whatsappStatus = this.stats.whatsappStatus;
    console.log('WhatsApp status:', whatsappStatus); // Debug log
    
    const statusElement = document.getElementById('whatsapp-status');
    if (statusElement) {
      let statusText = 'Offline';
      let statusClass = 'text-danger';
      
      if (whatsappStatus === 'online') {
        statusText = 'Online';
        statusClass = 'text-success';
      } else if (whatsappStatus === 'typing') {
        statusText = 'Typing...';
        statusClass = 'text-primary';
      } else if (whatsappStatus === 'recording') {
        statusText = 'Recording audio...';
        statusClass = 'text-warning';
      }
      
      statusElement.textContent = statusText;
      statusElement.className = statusClass;
    }
    
    // Update system info
    document.getElementById('uptime').textContent = this.stats.uptime || '-';
    document.getElementById('memoryUsage').textContent = this.stats.memoryUsage || '-';
    document.getElementById('commandCount').textContent = this.stats.commandCount || '-';
    document.getElementById('maintenanceMode').textContent = this.stats.maintenanceMode ? 'Aktif' : 'Nonaktif';
  }
}

/**
 * Settings Manager JavaScript
 * Handles settings functionality for the WhatsApp Bot
 */
class SettingsManager {
  constructor() {
    this.settings = {};
    this.maintenanceModeToggle = document.getElementById('maintenanceModeToggle');
    this.aiProviderSelect = document.getElementById('aiProviderSelect');
    this.commandPrefixInput = document.getElementById('commandPrefixInput');
    this.saveSettingsBtn = document.getElementById('saveSettings');
    
    // Initialize settings
    this.init();
  }
  
  /**
   * Initialize settings
   */
  init() {
    // Load settings
    this.loadSettings();
    
    // Setup save button
    this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
  }
  
  /**
   * Load settings from API
   */
  async loadSettings() {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.settings = data.settings;
        this.updateSettingsUI();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  /**
   * Update settings UI with loaded settings
   */
  updateSettingsUI() {
    this.maintenanceModeToggle.checked = this.settings.maintenanceMode;
    this.aiProviderSelect.value = this.settings.aiProvider;
    this.commandPrefixInput.value = this.settings.commandPrefix;
  }
  
  /**
   * Save settings to API
   */
  async saveSettings() {
    try {
      const maintenanceMode = this.maintenanceModeToggle.checked;
      const aiProvider = this.aiProviderSelect.value;
      const commandPrefix = this.commandPrefixInput.value;
      
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          maintenanceMode,
          aiProvider,
          commandPrefix
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Pengaturan berhasil disimpan!');
        
        // Refresh dashboard stats to show updated settings
        if (window.dashboardManager) {
          window.dashboardManager.loadDashboardStats();
        }
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Terjadi kesalahan saat menyimpan pengaturan.');
    }
  }
}

/**
 * WhatsApp Manager JavaScript
 * Handles WhatsApp functionality for the WhatsApp Bot
 */
class WhatsAppManager {
  constructor() {
    // Initialize WhatsApp Manager
    this.init();
  }
  
  /**
   * Initialize the WhatsApp Manager
   */
  init() {
    // Setup event listeners
    this.setupEventListeners();
    
    // Load initial WhatsApp status
    this.loadWhatsAppStatus();
    
    // Load QR code
    this.updateQRCodeUI();
    
    // Load WhatsApp settings
    this.updateWhatsAppSettingsUI();
    
    // Setup auto refresh
    this.setupAutoRefresh();
  }
  
  /**
   * Setup event listeners for WhatsApp Manager
   */
  setupEventListeners() {
    // Refresh QR button
    document.getElementById('refresh-qr-btn')?.addEventListener('click', async () => {
      try {
        await refreshQRCode();
        setTimeout(() => this.updateQRCodeUI(), 2000); // Wait 2 seconds for new QR
      } catch (error) {
        console.error('Error refreshing QR code:', error);
      }
    });
    
    // Save settings button
    document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveWhatsAppSettingsHandler());
    
    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      this.showConfirmation('Logout WhatsApp', 'Yakin ingin logout dari WhatsApp?', async () => {
        try {
          await logoutWhatsApp();
          this.loadWhatsAppStatus();
          this.updateQRCodeUI();
        } catch (error) {
          alert(`Gagal logout: ${error.message}`);
        }
      });
    });
    
    // Restart button
    document.getElementById('restart-btn')?.addEventListener('click', () => {
      this.showConfirmation('Restart Client', 'Yakin ingin restart WhatsApp client?', async () => {
        try {
          await restartWhatsApp();
          this.loadWhatsAppStatus();
          this.updateQRCodeUI();
        } catch (error) {
          alert(`Gagal restart: ${error.message}`);
        }
      });
    });
    
    // Reset button
    document.getElementById('reset-btn')?.addEventListener('click', () => {
      this.showConfirmation('Reset Sesi', 'PERHATIAN: Ini akan menghapus semua data sesi WhatsApp. Yakin ingin melanjutkan?', async () => {
        try {
          await resetWhatsApp();
          this.loadWhatsAppStatus();
          this.updateQRCodeUI();
        } catch (error) {
          alert(`Gagal reset: ${error.message}`);
        }
      });
    });
  }
  
  /**
   * Load WhatsApp status
   */
  async loadWhatsAppStatus() {
    try {
      const statusData = await getWhatsAppStatus();
      this.updateWhatsAppStatusUI(statusData.whatsappStatus);
    } catch (error) {
      console.error('Error loading WhatsApp status:', error);
    }
  }
  
  /**
   * Update WhatsApp status UI
   */
  updateWhatsAppStatusUI(status) {
    const statusElement = document.getElementById('whatsapp-status');
    const statusText = document.getElementById('status-text');
    
    if (!statusElement || !statusText) return;
    
    if (status === 'online') {
      statusElement.className = 'status online mb-3';
      statusText.textContent = 'Online';
    } else if (status === 'connecting') {
      statusElement.className = 'status connecting mb-3';
      statusText.textContent = 'Menghubungkan...';
    } else {
      statusElement.className = 'status offline mb-3';
      statusText.textContent = 'Offline';
    }
  }
  
  /**
   * Update QR code UI
   */
  async updateQRCodeUI() {
    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer) return;
    
    qrContainer.innerHTML = `
      <div class="text-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Memuat QR Code...</p>
      </div>
    `;
    
    try {
      const data = await getWhatsAppQR();
      if (data.success && data.qrImageUrl) {
        qrContainer.innerHTML = `
          <img src="${data.qrImageUrl}" alt="WhatsApp QR Code" class="img-fluid">
        `;
      } else {
        qrContainer.innerHTML = `
          <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle"></i> ${data.message || 'QR Code belum tersedia. Silakan klik tombol "Refresh QR".'}
          </div>
        `;
      }
    } catch (error) {
      qrContainer.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle"></i> Gagal memuat QR Code: ${error.message}
        </div>
      `;
    }
  }
  
  /**
   * Update WhatsApp settings UI
   */
  async updateWhatsAppSettingsUI() {
    try {
      const data = await getWhatsAppSettings();
      if (data.success && data.settings) {
        document.getElementById('headless').checked = data.settings.headless;
        document.getElementById('qr-timeout').value = data.settings.qrTimeout;
        document.getElementById('reconnect-attempts').value = data.settings.reconnectAttempts;
      }
    } catch (error) {
      console.error('Error updating WhatsApp settings UI:', error);
    }
  }
  
  /**
   * Save WhatsApp settings
   */
  async saveWhatsAppSettingsHandler() {
    const headless = document.getElementById('headless').checked;
    const qrTimeout = document.getElementById('qr-timeout').value;
    const reconnectAttempts = document.getElementById('reconnect-attempts').value;
    
    try {
      const data = await saveWhatsAppSettings({
        headless,
        qrTimeout,
        reconnectAttempts
      });
      
      if (data.success) {
        alert('Pengaturan WhatsApp berhasil disimpan!');
      } else {
        alert(`Gagal menyimpan pengaturan: ${data.error}`);
      }
    } catch (error) {
      alert(`Gagal menyimpan pengaturan: ${error.message}`);
    }
  }
  
  /**
   * Setup auto refresh for WhatsApp status and QR code
   */
  setupAutoRefresh() {
    // Refresh status every 10 seconds
    setInterval(() => this.loadWhatsAppStatus(), 10000);
    
    // Auto refresh QR tab every 20 seconds if tab is active
    setInterval(() => {
      const whatsappTab = document.getElementById('whatsapp-tab');
      const loginTab = document.getElementById('login-tab');
      if (whatsappTab?.classList.contains('active') && loginTab?.classList.contains('active')) {
        this.updateQRCodeUI();
      }
    }, 20000);
  }
  
  /**
   * Show confirmation modal
   */
  showConfirmation(title, message, callback) {
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    document.getElementById('confirmationTitle').textContent = title;
    document.getElementById('confirmationMessage').textContent = message;
    
    document.getElementById('confirmBtn').onclick = () => {
      modal.hide();
      callback();
    };
    
    modal.show();
  }
}

// Initialize managers when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardManager = new DashboardManager();
  
  // Initialize WhatsApp Manager
  window.whatsappManager = new WhatsAppManager();
  
  // Only initialize settings manager if we're on the settings section
  if (document.getElementById('settingsForm')) {
    window.settingsManager = new SettingsManager();
  }
});