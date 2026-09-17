import { api } from './client.js';

export const draftApi = {
  listMine: () => api.get('/draft/all'),
  listEditors: () => api.get('/draft/editors'),
  promote: (documentId, editorIds) => api.post(`/draft/promote/${documentId}`, { editorIds }),
};
