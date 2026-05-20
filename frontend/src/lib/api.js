import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  // Only inject the client token if no Authorization header is already set
  // (super-admin calls pass their own token explicitly)
  if (!config.headers.Authorization) {
    const token = localStorage.getItem('payslip_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('payslip_token');
      localStorage.removeItem('payslip_role');
      localStorage.removeItem('employee_name');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
