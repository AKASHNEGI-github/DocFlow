import { api } from './client.js';

export const deletionApi = {
  myRequests: () => api.get('/deletion/my-requests'),
  forApproval: () => api.get('/deletion/for-approval'),
  request: (documentId, data) => api.post(`/deletion/request/${documentId}`, data),
  cancel: (deleteRequestId) => api.post(`/deletion/cancel/${deleteRequestId}`),
  action: (deleteRequestId, action, comments) => api.post(`/deletion/action/${deleteRequestId}`, { action, comments }),
};
