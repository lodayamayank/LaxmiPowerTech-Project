import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export function useBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/branches', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBranches(res.data?.branches || res.data || []);
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, []);

  return { branches, loading };
}
