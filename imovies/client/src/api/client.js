import axios from 'axios';

export const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('imovies_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const isLogin = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && localStorage.getItem('imovies_token') && !isLogin) {
      localStorage.removeItem('imovies_token');
      localStorage.removeItem('imovies_user');
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    }
    return Promise.reject(err);
  }
);

export const errMsg = (err) => err.response?.data?.message || err.message || 'Something went wrong';
export default api;
