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

  delete: async (id) => {
    const response = await axios.delete(`/material/site-transfers/${id}`);
    return response.data;
  },

  deleteAttachment: async (id, attachmentIndex) => {
    const response = await axios.delete(`/material/site-transfers/${id}/attachments/${attachmentIndex}`);
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

  deleteAttachment: async (id, attachmentIndex) => {
    const response = await axios.delete(`/material/purchase-orders/${id}/attachments/${attachmentIndex}`);
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

  updateStatus: async (id, status, adminRemarks = '') => {
    const response = await axios.put(`/indents/${id}/status`, { status, adminRemarks });
    return response.data;
  },

  delete: async (id) => {
    const response = await axios.delete(`/indents/${id}`);
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

  updateItems: async (id, items) => {
    const response = await axios.put(`/material/upcoming-deliveries/${id}/items`, { items });
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await axios.put(`/material/upcoming-deliveries/${id}/status`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await axios.delete(`/material/upcoming-deliveries/${id}`);
    return response.data;
  }
};

export default {
  materialCatalog: materialCatalogAPI,
  siteTransfer: siteTransferAPI,
  purchaseOrder: purchaseOrderAPI,
  upcomingDelivery: upcomingDeliveryAPI,
  indent: indentAPI
};