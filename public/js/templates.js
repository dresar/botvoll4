/**
 * Template Manager JavaScript
 * Handles all template-related operations for the WhatsApp Bot dashboard
 */

class TemplateManager {
  constructor() {
    this.templates = [];
    this.currentFilter = '';
    this.searchTerm = '';
    this.tableBody = document.getElementById('templatesTableBody');
    this.categoryFilter = document.getElementById('templateCategoryFilter');
    this.searchInput = document.getElementById('templateSearch');
    
    // Initialize event listeners
    this.initEventListeners();
  }
  
  /**
   * Initialize all event listeners for template management
   */
  initEventListeners() {
    // Category filter change event
    this.categoryFilter.addEventListener('change', () => {
      this.currentFilter = this.categoryFilter.value;
      this.loadTemplates();
    });
    
    // Search input event
    this.searchInput.addEventListener('input', () => {
      this.searchTerm = this.searchInput.value.toLowerCase();
      this.filterTemplates();
    });
    
    // Save new template
    document.getElementById('saveTemplateBtn').addEventListener('click', () => this.saveTemplate());
    
    // Update template
    document.getElementById('updateTemplateBtn').addEventListener('click', () => this.updateTemplate());
  }
  
  /**
   * Load templates from the API
   */
  async loadTemplates() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login.html';
        return;
      }
      
      let url = '/api/templates';
      if (this.currentFilter) {
        url += `?category=${this.currentFilter}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.templates = data.templates;
        this.renderTemplates();
      } else {
        console.error('Error loading templates:', data.message);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }
  
  /**
   * Render templates to the table
   */
  renderTemplates() {
    this.tableBody.innerHTML = '';
    
    this.templates.forEach(template => {
      const row = document.createElement('tr');
      
      // Truncate content if too long
      let displayContent = template.content;
      if (displayContent.length > 50) {
        displayContent = displayContent.substring(0, 50) + '...';
      }
      
      row.innerHTML = `
        <td>${template.id}</td>
        <td>${this.getCategoryName(template.category)}</td>
        <td>${template.title}</td>
        <td>${displayContent}</td>
        <td>${template.created_by || 'System'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${template.id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${template.id}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      
      this.tableBody.appendChild(row);
    });
    
    // Add event listeners to edit and delete buttons
    this.setupTemplateActions();
    
    // Apply search filter if there's a search term
    if (this.searchTerm) {
      this.filterTemplates();
    }
  }
  
  /**
   * Filter templates based on search term
   */
  filterTemplates() {
    const rows = document.querySelectorAll('#templatesTableBody tr');
    
    rows.forEach(row => {
      const title = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
      const content = row.querySelector('td:nth-child(4)').textContent.toLowerCase();
      
      if (title.includes(this.searchTerm) || content.includes(this.searchTerm)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }
  
  /**
   * Setup template edit and delete actions
   */
  setupTemplateActions() {
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await this.loadTemplateDetails(id);
      });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await this.deleteTemplate(id);
      });
    });
  }
  
  /**
   * Load template details for editing
   */
  async loadTemplateDetails(id) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/templates/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        const template = data.template;
        
        document.getElementById('editTemplateId').value = template.id;
        document.getElementById('editTemplateCategory').value = template.category;
        document.getElementById('editTemplateTitle').value = template.title;
        document.getElementById('editTemplateContent').value = template.content;
        
        const modal = new bootstrap.Modal(document.getElementById('editTemplateModal'));
        modal.show();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error fetching template details:', error);
      alert('Terjadi kesalahan saat memuat detail template.');
    }
  }
  
  /**
   * Save a new template
   */
  async saveTemplate() {
    try {
      const category = document.getElementById('templateCategory').value;
      const title = document.getElementById('templateTitle').value;
      const content = document.getElementById('templateContent').value;
      
      if (!category || !title || !content) {
        alert('Semua field harus diisi!');
        return;
      }
      
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category, title, content })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTemplateModal'));
        modal.hide();
        document.getElementById('addTemplateForm').reset();
        
        // Reload templates
        this.loadTemplates();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error adding template:', error);
      alert('Terjadi kesalahan saat menyimpan template.');
    }
  }
  
  /**
   * Update an existing template
   */
  async updateTemplate() {
    try {
      const id = document.getElementById('editTemplateId').value;
      const category = document.getElementById('editTemplateCategory').value;
      const title = document.getElementById('editTemplateTitle').value;
      const content = document.getElementById('editTemplateContent').value;
      
      if (!category || !title || !content) {
        alert('Semua field harus diisi!');
        return;
      }
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category, title, content })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTemplateModal'));
        modal.hide();
        
        // Reload templates
        this.loadTemplates();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Terjadi kesalahan saat memperbarui template.');
    }
  }
  
  /**
   * Delete a template
   */
  async deleteTemplate(id) {
    try {
      if (confirm('Apakah Anda yakin ingin menghapus template ini?')) {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/api/templates/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.loadTemplates();
        } else {
          alert('Error: ' + data.message);
        }
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Terjadi kesalahan saat menghapus template.');
    }
  }
  
  /**
   * Helper function to get category name
   */
  getCategoryName(category) {
    const categories = {
      'greeting': 'Salam',
      'introduction': 'Perkenalan',
      'pickup_line': 'Gombalan',
      'joke': 'Lelucon',
      'other': 'Lainnya'
    };
    
    return categories[category] || category;
  }
}

// Initialize the template manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on the templates section
  if (document.getElementById('templatesTableBody')) {
    window.templateManager = new TemplateManager();
  }
});