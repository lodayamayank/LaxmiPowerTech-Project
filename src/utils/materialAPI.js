import axios from './axios';

// Material Catalog API
export const materialCatalogAPI = {
  uploadExcel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post('/material/catalog/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getAll: async () => {
    const response = await axios.get('/material/catalog');
    return response.data;
  },

  getLastExcel: async () => {
    const response = await axios.get('/material/catalog/last');
    return response.data;
  },

  getMaterials: async () => {
    const response = await axios.get('/material/catalog/materials');
    return response.data;
  }
};

// Site Transfer API
export const siteTransferAPI = {
  create: async (data) => {
    const config = data instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {};
    const response = await axios.post('/material/site-transfers', data, config);
    return response.data;
  },

  getAll: async (page = 1, limit = 10) => {
    const response = await axios.get('/material/site-transfers', {
      params: { page, limit }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await axios.get(`/material/site-transfers/${id}`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axios.put(`/material/site-transfers/${id}`, data);
    return response.data;
  },

  approve: async (id) => {
    const response = await axios.put(`/material/site-transfers/${id}/approve`);
    return response.data;
  },

  delete: async (id) => {
    const response = await axios.delete(`/material/site-transfers/${id}`);
    return response.data;
  },

  deleteAttachment: async (id, attachmentIndex) => {
    const response = await axios.delete(`/material/site-transfers/${id}/attachments/${attachmentIndex}`);
    return response.data;
  },

  deleteAll: async () => {
    const response = await axios.delete('/material/site-transfers/all');
    return response.data;
  }
};

// Purchase Order API
export const purchaseOrderAPI = {
  create: async (data) => {
    const config = data instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {};
    const response = await axios.post('/material/purchase-orders', data, config);
    return response.data;
  },

  getAll: async (page = 1, limit = 10, search = '') => {
    const response = await axios.get('/material/purchase-orders', {
      params: { page, limit, search }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await axios.get(`/material/purchase-orders/${id}`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axios.put(`/material/purchase-orders/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axios.delete(`/material/purchase-orders/${id}`);
    return response.data;
  },

  approve: async (id) => {
    const response = await axios.put(`/material/purchase-orders/${id}/approve`);
    return response.data;
  },

  deleteAttachment: async (id, attachmentIndex) => {
    const response = await axios.delete(`/material/purchase-orders/${id}/attachments/${attachmentIndex}`);
    return response.data;
  },

  deleteAll: async () => {
    const response = await axios.delete('/material/purchase-orders/all');
    return response.data;
  }
};

// Indent API (Intent with Photo Upload)
export const indentAPI = {
  uploadPhoto: async (formData) => {
    const response = await axios.post('/indents/upload-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getAll: async (page = 1, limit = 10, search = '') => {
    const response = await axios.get('/indents', {
      params: { page, limit, search }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await axios.get(`/indents/${id}`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axios.put(`/indents/${id}`, data);
    return response.data;
  },

  addMaterial: async (id, data) => {
    const response = await axios.post(`/indents/${id}/materials`, data);
    return response.data;
  },

  updateMaterial: async (id, materialId, data) => {
    const response = await axios.put(`/indents/${id}/materials/${materialId}`, data);
    return response.data;
  },

  deleteMaterial: async (id, materialId) => {
    const response = await axios.delete(`/indents/${id}/materials/${materialId}`);
    return response.data;
  },

  updateStatus: async (id, status, adminRemarks = '') => {
    const response = await axios.put(`/indents/${id}/status`, { status, adminRemarks });
    return response.data;
  },

  delete: async (id) => {
    const response = await axios.delete(`/indents/${id}`);
    return response.data;
  },

  deleteAll: async () => {
    const response = await axios.delete('/indents/all');
    return response.data;
  },
  
  approve: async (id) => {
    const response = await axios.put(`/indents/${id}/approve`);
    return response.data;
  }
};

// Upcoming Delivery API
export const upcomingDeliveryAPI = {
  getAll: async (page = 1, limit = 10, search = '') => {
    const response = await axios.get('/material/upcoming-deliveries', {
      params: { page, limit, search }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await axios.get(`/material/upcoming-deliveries/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await axios.post('/material/upcoming-deliveries', data);
    return response.data;
  },

  updateItems: async (id, items, options = {}) => {
    const response = await axios.put(`/material/upcoming-deliveries/${id}/items`, { items, ...options });
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await axios.put(`/material/upcoming-deliveries/${id}/status`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await axios.delete(`/material/upcoming-deliveries/${id}`);
    return response.data;
  },

  deleteAll: async () => {
    const response = await axios.delete('/material/upcoming-deliveries/all');
    return response.data;
  },

  // ✅ Upload delivery receipt images
  uploadReceipts: async (id, files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('receipts', file));
    const response = await axios.post(
      `/material/upcoming-deliveries/${id}/upload-receipts`, 
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  // ✅ Delete delivery receipt attachment
  deleteAttachment: async (id, attachmentIndex) => {
    const response = await axios.delete(
      `/material/upcoming-deliveries/${id}/attachments/${attachmentIndex}`
    );
    return response.data;
  },
  // ✅ Migration endpoint to sync existing Intent POs
  migrateSync: async () => {
    const response = await axios.post('/material/upcoming-deliveries/migrate-sync');
    return response.data;
  },

  // ✅ Update GRN billing details
  updateBilling: async (id, billingData) => {
    const response = await axios.put(`/material/upcoming-deliveries/${id}/billing`, billingData);
    return response.data;
  }
};

// Projects API
export const projectsAPI = {
  getAll: async () => {
    const response = await axios.get('/projects');
    return response.data;
  }
};

// Branches API
export const branchesAPI = {
  getAll: async () => {
    const response = await axios.get('/branches');
    return response.data;
  }
};

// Vendors API
export const vendorsAPI = {
  getAll: async () => {
    try {
      console.log('🔍 Fetching vendors from /api/vendors');
      const response = await axios.get('/vendors');
      console.log('✅ Vendors fetched successfully:', response.data?.length || 0, 'vendors');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching vendors:', error.response?.status, error.response?.data || error.message);
      console.error('Request URL:', error.config?.url);
      throw error;
    }
  },
  
  create: async (data) => {
    const response = await axios.post('/vendors', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await axios.put(`/vendors/${id}`, data);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await axios.delete(`/vendors/${id}`);
    return response.data;
  }
};

export default {
  materialCatalog: materialCatalogAPI,
  siteTransfer: siteTransferAPI,
  purchaseOrder: purchaseOrderAPI,
  upcomingDelivery: upcomingDeliveryAPI,
  indent: indentAPI,
  projects: projectsAPI,
  branches: branchesAPI,
  vendors: vendorsAPI
};
