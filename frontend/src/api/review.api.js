import { api } from './client.js';

export const reviewApi = {
  myRequests: () => api.get('/review/my-requests'),
  forApproval: () => api.get('/review/for-approval'),
  listPublishers: () => api.get('/review/publishers'),
  promote: (documentId, publisherIds) => api.post(`/review/promote/${documentId}`, { publisherIds }),
  repromote: (documentId, reviewerIds) => api.post(`/review/repromote/${documentId}`, { reviewerIds }),
  cancel: (documentId) => api.post(`/review/cancel/${documentId}`),
  action: (documentId, action, comments) => api.post(`/review/action/${documentId}`, { action, comments }),
};
