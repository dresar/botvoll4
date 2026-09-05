/**
 * Members Management JavaScript
 * Handles all member-related functionality in the dashboard
 */

class MemberManager {
  constructor() {
    this.members = [];
    this.currentStatus = 'all';
    this.token = localStorage.getItem('token');
    
    // Initialize the dashboard
    this.init();
  }
  
  /**
   * Initialize the member management dashboard
   */
  async init() {
    // Check authentication
    if (!this.token) {
      window.location.href = 'login.html';
      return;
    }
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load members
    await this.loadMembers();
    
    // Check for pending members
    await this.checkPendingMembers();
  }
  
  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Refresh button
    document.getElementById('refreshMembers').addEventListener('click', () => {
      this.loadMembers(this.currentStatus);
    });
    
    // Filter dropdown
    document.querySelectorAll('.filter-status').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const status = e.target.getAttribute('data-status');
        this.currentStatus = status;
        this.loadMembers(status);
      });
    });
    
    // Save button in modal
    document.getElementById('save-btn').addEventListener('click', () => {
      this.saveMember();
    });
    
    // Approve button in modal
    document.getElementById('approve-btn').addEventListener('click', () => {
      this.showConfirmation(
        'Setujui Member', 
        'Apakah Anda yakin ingin menyetujui pendaftaran member ini?',
        () => this.approveMember()
      );
    });
    
    // Reject button in modal
    document.getElementById('reject-btn').addEventListener('click', () => {
      this.showConfirmation(
        'Tolak Member', 
        'Apakah Anda yakin ingin menolak pendaftaran member ini?',
        () => this.rejectMember()
      );
    });
    
    // Delete button in modal
    document.getElementById('delete-btn').addEventListener('click', () => {
      this.showConfirmation(
        'Hapus Member', 
        'Apakah Anda yakin ingin menghapus member ini? Tindakan ini tidak dapat dibatalkan.',
        () => this.deleteMember()
      );
    });
    
    // Confirmation modal button
    document.getElementById('confirmBtn').addEventListener('click', () => {
      if (this.confirmCallback) {
        this.confirmCallback();
        this.hideConfirmationModal();
      }
    });
  }
  
  /**
   * Load members from the API
   */
  async loadMembers(status = 'all') {
    try {
      const url = status === 'all' ? '/api/members' : `/api/members?status=${status}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          window.location.href = 'login.html';
          return;
        }
        throw new Error('Failed to load members');
      }
      
      const data = await response.json();
      this.members = data.members;
      this.renderMembersTable();
    } catch (error) {
      console.error('Error loading members:', error);
      this.showAlert('danger', 'Gagal memuat data member. Silakan coba lagi.');
    }
  }
  
  /**
   * Check for pending members
   */
  async checkPendingMembers() {
    try {
      const response = await fetch('/api/members/pending/count', {
        headers: {
          'Authorization': `Bearer ${this.token}`
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
   * Render the members table
   */
  renderMembersTable() {
    const tableBody = document.getElementById('members-list');
    tableBody.innerHTML = '';
    
    if (this.members.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="7" class="text-center">Tidak ada data member</td>`;
      tableBody.appendChild(row);
      return;
    }
    
    this.members.forEach(member => {
      const row = document.createElement('tr');
      
      // Format date
      const joinDate = new Date(member.join_date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      // Status badge
      let statusBadge = '';
      switch (member.status) {
        case 'pending':
          statusBadge = '<span class="badge bg-warning text-dark">Menunggu</span>';
          break;
        case 'approved':
          statusBadge = '<span class="badge bg-success">Disetujui</span>';
          break;
        case 'rejected':
          statusBadge = '<span class="badge bg-danger">Ditolak</span>';
          break;
        default:
          statusBadge = '<span class="badge bg-secondary">Unknown</span>';
      }
      
      row.innerHTML = `
        <td>${member.id}</td>
        <td>${member.name}</td>
        <td>${member.phone}</td>
        <td>${member.email || '-'}</td>
        <td>${statusBadge}</td>
        <td>${member.membership_type || 'free'}</td>
        <td>${member.credits || 0}</td>
        <td>${joinDate}</td>
        <td>
          <button class="btn btn-sm btn-primary view-btn" data-id="${member.id}">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      `;
      
      tableBody.appendChild(row);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.viewMember(id);
      });
    });
  }
  
  /**
   * View member details
   */
  async viewMember(id) {
    try {
      const response = await fetch(`/api/members/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load member details');
      }
      
      const data = await response.json();
      const member = data.member;
      
      // Fill the modal form
      document.getElementById('member-id').value = member.id;
      document.getElementById('member-name').value = member.name;
      document.getElementById('member-phone').value = member.phone;
      document.getElementById('member-email').value = member.email || '';
      document.getElementById('member-membership').value = member.membership_type || 'free';
      
      // Set expiry date if available
      const expiresInput = document.getElementById('member-expires');
      if (member.membership_expires) {
        const expiryDate = new Date(member.membership_expires);
        expiresInput.value = expiryDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      } else {
        expiresInput.value = '';
      }
      
      document.getElementById('member-credits').value = member.credits || 0;
      document.getElementById('member-notes').value = member.notes || '';
      
      // Status badge
      const statusBadgeElement = document.querySelector('#status-info .status-badge');
      let statusBadge = '';
      switch (member.status) {
        case 'pending':
          statusBadge = '<span class="badge bg-warning text-dark">Menunggu Persetujuan</span>';
          break;
        case 'approved':
          statusBadge = '<span class="badge bg-success">Disetujui</span>';
          break;
        case 'rejected':
          statusBadge = '<span class="badge bg-danger">Ditolak</span>';
          break;
        default:
          statusBadge = '<span class="badge bg-secondary">Unknown</span>';
      }
      statusBadgeElement.innerHTML = statusBadge;
      
      // Approval info
      const approvalInfoElement = document.getElementById('approval-info');
      const approvalDetailsElement = document.getElementById('approval-details');
      
      if (member.status === 'approved' || member.status === 'rejected') {
        approvalInfoElement.classList.remove('d-none');
        const approvedDate = member.approved_date ? new Date(member.approved_date).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-';
        
        approvalDetailsElement.innerHTML = `
          <p><strong>Tanggal:</strong> ${approvedDate}</p>
          <p><strong>Oleh:</strong> ${member.approved_by || '-'}</p>
        `;
      } else {
        approvalInfoElement.classList.add('d-none');
      }
      
      // Show/hide buttons based on status
      const approveBtn = document.getElementById('approve-btn');
      const rejectBtn = document.getElementById('reject-btn');
      
      if (member.status === 'pending') {
        approveBtn.classList.remove('d-none');
        rejectBtn.classList.remove('d-none');
      } else {
        approveBtn.classList.add('d-none');
        rejectBtn.classList.add('d-none');
      }
      
      // Show the modal
      const memberModal = new bootstrap.Modal(document.getElementById('memberModal'));
      memberModal.show();
    } catch (error) {
      console.error('Error viewing member:', error);
      this.showAlert('danger', 'Gagal memuat detail member. Silakan coba lagi.');
    }
  }
  
  /**
   * Save member changes
   */
  async saveMember() {
    try {
      const id = document.getElementById('member-id').value;
      const name = document.getElementById('member-name').value;
      const phone = document.getElementById('member-phone').value;
      const email = document.getElementById('member-email').value;
      const membership_type = document.getElementById('member-membership').value;
      const membership_expires = document.getElementById('member-expires').value;
      const credits = document.getElementById('member-credits').value;
      const notes = document.getElementById('member-notes').value;
      
      if (!name || !phone) {
        this.showAlert('danger', 'Nama dan nomor telepon harus diisi.');
        return;
      }
      
      const response = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          name,
          phone,
          email,
          membership_type,
          membership_expires: membership_expires || null,
          credits: parseInt(credits) || 0,
          notes
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update member');
      }
      
      // Hide the modal
      const memberModal = bootstrap.Modal.getInstance(document.getElementById('memberModal'));
      memberModal.hide();
      
      // Reload members
      await this.loadMembers(this.currentStatus);
      
      this.showAlert('success', 'Member berhasil diperbarui.');
    } catch (error) {
      console.error('Error saving member:', error);
      this.showAlert('danger', 'Gagal memperbarui member. Silakan coba lagi.');
    }
  }
  
  /**
   * Approve a member
   */
  async approveMember() {
    try {
      const id = document.getElementById('member-id').value;
      
      const response = await fetch(`/api/members/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve member');
      }
      
      // Hide the modal
      const memberModal = bootstrap.Modal.getInstance(document.getElementById('memberModal'));
      memberModal.hide();
      
      // Reload members
      await this.loadMembers(this.currentStatus);
      
      // Update pending count
      await this.checkPendingMembers();
      
      this.showAlert('success', 'Member berhasil disetujui.');
    } catch (error) {
      console.error('Error approving member:', error);
      this.showAlert('danger', 'Gagal menyetujui member. Silakan coba lagi.');
    }
  }
  
  /**
   * Reject a member
   */
  async rejectMember() {
    try {
      const id = document.getElementById('member-id').value;
      
      const response = await fetch(`/api/members/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject member');
      }
      
      // Hide the modal
      const memberModal = bootstrap.Modal.getInstance(document.getElementById('memberModal'));
      memberModal.hide();
      
      // Reload members
      await this.loadMembers(this.currentStatus);
      
      // Update pending count
      await this.checkPendingMembers();
      
      this.showAlert('success', 'Member berhasil ditolak.');
    } catch (error) {
      console.error('Error rejecting member:', error);
      this.showAlert('danger', 'Gagal menolak member. Silakan coba lagi.');
    }
  }
  
  /**
   * Delete a member
   */
  async deleteMember() {
    try {
      const id = document.getElementById('member-id').value;
      
      const response = await fetch(`/api/members/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete member');
      }
      
      // Hide the modal
      const memberModal = bootstrap.Modal.getInstance(document.getElementById('memberModal'));
      memberModal.hide();
      
      // Reload members
      await this.loadMembers(this.currentStatus);
      
      // Update pending count if needed
      await this.checkPendingMembers();
      
      this.showAlert('success', 'Member berhasil dihapus.');
    } catch (error) {
      console.error('Error deleting member:', error);
      this.showAlert('danger', 'Gagal menghapus member. Silakan coba lagi.');
    }
  }
  
  /**
   * Show confirmation modal
   */
  showConfirmation(title, message, callback) {
    document.getElementById('confirmationTitle').textContent = title;
    document.getElementById('confirmationMessage').textContent = message;
    this.confirmCallback = callback;
    
    const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    confirmationModal.show();
  }
  
  /**
   * Hide confirmation modal
   */
  hideConfirmationModal() {
    const confirmationModal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
    confirmationModal.hide();
  }
  
  /**
   * Show alert message
   */
  showAlert(type, message) {
    // Create alert element
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.setAttribute('role', 'alert');
    alertElement.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to the top of the main content
    const mainContent = document.querySelector('main');
    mainContent.insertBefore(alertElement, mainContent.firstChild);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      alertElement.classList.remove('show');
      setTimeout(() => alertElement.remove(), 150);
    }, 5000);
  }
}

// Initialize the member manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MemberManager();
});