// WhatsApp API Client

/**
 * Fungsi untuk mendapatkan token autentikasi dari localStorage
 * @returns {string|null} Token autentikasi
 */
function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * Fungsi untuk mendapatkan headers dengan token autentikasi
 * @param {Object} additionalHeaders Header tambahan
 * @returns {Object} Headers dengan token autentikasi
 */
function getAuthHeaders(additionalHeaders = {}) {
  const token = getAuthToken();
  const headers = {
    ...additionalHeaders
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Fungsi untuk mendapatkan status WhatsApp
 * @returns {Promise<Object>} Status WhatsApp
 */
async function getWhatsAppStatus() {
  try {
    const response = await fetch('/api/stats', {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching WhatsApp status:', error);
    return { whatsappStatus: 'error', error: error.message };
  }
}

/**
 * Fungsi untuk mendapatkan QR code
 * @returns {Promise<Object>} QR code data
 */
async function getWhatsAppQR() {
  try {
    const response = await fetch('/api/whatsapp/qr', {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching WhatsApp QR code:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fungsi untuk mendapatkan pengaturan WhatsApp
 * @returns {Promise<Object>} Pengaturan WhatsApp
 */
async function getWhatsAppSettings() {
  try {
    const response = await fetch('/api/whatsapp/settings', {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching WhatsApp settings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fungsi untuk menyimpan pengaturan WhatsApp
 * @param {Object} settings Pengaturan WhatsApp
 * @returns {Promise<Object>} Hasil penyimpanan
 */
async function saveWhatsAppSettings(settings) {
  try {
    const response = await fetch('/api/whatsapp/settings', {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving WhatsApp settings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fungsi untuk logout dari WhatsApp
 * @returns {Promise<Object>} Hasil logout
 */
async function logoutWhatsApp() {
  try {
    const response = await fetch('/whatsapp-login/logout', {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Error logging out from WhatsApp:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fungsi untuk restart WhatsApp client
 * @returns {Promise<Object>} Hasil restart
 */
async function restartWhatsApp() {
  try {
    const response = await fetch('/whatsapp-login/restart', {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Error restarting WhatsApp client:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fungsi untuk reset sesi WhatsApp
 * @returns {Promise<Object>} Hasil reset
 */
async function resetWhatsApp() {
  try {
    const response = await fetch('/whatsapp-login/reset', {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Error resetting WhatsApp session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fungsi untuk refresh QR code
 * @returns {Promise<Object>} Hasil refresh
 */
async function refreshQRCode() {
  try {
    const response = await fetch('/whatsapp-login/refresh', {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Error refreshing QR code:', error);
    return { success: false, error: error.message };
  }
}