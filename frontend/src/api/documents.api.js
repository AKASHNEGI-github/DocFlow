import { api } from './client.js';

export const documentsApi = {
  create: (data) => api.post('/documents/new', data),
  listMine: () => api.get('/documents/all'),
  getById: (documentId) => api.get(`/documents/${documentId}`),
  update: (documentId, patch) => api.put(`/documents/${documentId}`, patch),
  remove: (documentId) => api.delete(`/documents/${documentId}`),
};
