import axios from '../utils/axios';

export const getAllTransfers = async (params) => {
  const res = await axios.get('/material-transfers', { params });
  return res.data;
};

export const decideTransfer = async (id, action, remarks) => {
  const res = await axios.put(`/material-transfers/${id}/decide`, { action, remarks });
  return res.data;
};

export const completeTransfer = async (id) => {
  const res = await axios.put(`/material-transfers/${id}/complete`);
  return res.data;
};
