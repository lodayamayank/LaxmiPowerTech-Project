import axios from '../utils/axios';

const API = import.meta.env.VITE_API_BASE_URL || '';

export const getAllTransfers = async (params) => {
  const res = await axios.get(`${API}/api/material-transfers`, { params });
  return res.data;
};

export const decideTransfer = async (id, action, remarks) => {
  const res = await axios.put(`${API}/api/material-transfers/${id}/decide`, { action, remarks });
  return res.data;
};

export const completeTransfer = async (id) => {
  const res = await axios.put(`${API}/api/material-transfers/${id}/complete`);
  return res.data;
};
