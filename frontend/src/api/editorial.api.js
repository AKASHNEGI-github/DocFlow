import { api } from './client.js';

export const editorialApi = {
  myRequests: () => api.get('/editorial/my-requests'),
  forApproval: () => api.get('/editorial/for-approval'),
  listReviewers: () => api.get('/editorial/reviewers'),
  promote: (documentId, reviewerIds) => api.post(`/editorial/promote/${documentId}`, { reviewerIds }),
  repromote: (documentId, editorIds) => api.post(`/editorial/repromote/${documentId}`, { editorIds }),
  cancel: (documentId) => api.post(`/editorial/cancel/${documentId}`),
  action: (documentId, action, comments) => api.post(`/editorial/action/${documentId}`, { action, comments }),
};
