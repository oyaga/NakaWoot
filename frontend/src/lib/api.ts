import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';

const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/api/v1',
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