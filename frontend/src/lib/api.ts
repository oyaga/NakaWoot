import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';

// Detectar baseURL dinamicamente - usar origin atual no browser
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin + '/api/v1';
  }
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/api/v1';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
const session = useAuthStore.getState().session;
const token = session?.access_token;
if (token) {
config.headers.Authorization = `Bearer ${token}`;
}
return config;
});

api.interceptors.response.use(
(response) => response,
(error) => {
if (error.response?.status === 401) {
useAuthStore.getState().logout();
window.location.href = '/login';
}
return Promise.reject(error);
}
);

export default api;