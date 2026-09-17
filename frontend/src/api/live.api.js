import { api } from './client.js';

export const liveApi = {
  feed: () => api.get('/live/feed'),
  listMine: () => api.get('/live/all'),
  upgrade: (documentId, data) => api.post(`/live/upgrade/${documentId}`, data),
};
