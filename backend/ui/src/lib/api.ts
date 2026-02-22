import axios from 'axios';

export const api = axios.create({
  baseURL: '/api', // Proxy will handle this
});

export const fetcher = (url: string) => api.get(url).then((res) => res.data);
