import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';

// Detectar baseURL dinamicamente - usar origin atual no browser
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin + '/api/v1';
  }
import axios from 'axios';
import { useAuthStore } from './store/useAuthStore';

// URL base da API (pode vir de variável de ambiente)
// Em produção (Docker), o frontend é servido pela mesma origem da API
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Se estiver rodando no browser
    // Se for desenvolvimento local (Next.js rodando separado do Go)
    if (window.location.port === '3000') {
      return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4120') + '/api/v1';
    }
    // Se for produção (Next.js exportado e servido pelo Go)
    return window.location.origin + '/api/v1';
  }
  
  // Server-side (SSR/SSG)
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4120') + '/api/v1';
};

export const api = axios.create({
  baseURL: getBaseUrl(),

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