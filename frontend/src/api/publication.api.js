import { api } from './client.js';

export const publicationApi = {
  myRequests: () => api.get('/publication/my-requests'),
  forApproval: () => api.get('/publication/for-approval'),
  listPublishers: () => api.get('/publication/publishers'),
  repromote: (documentId, publisherIds) => api.post(`/publication/repromote/${documentId}`, { publisherIds }),
  cancel: (documentId) => api.post(`/publication/cancel/${documentId}`),
  // action's `action` is 'APPROVED' (Publish) or 'REJECTED' (Unpublish) - see PublicationActionModal.
  action: (documentId, action, comments) => api.post(`/publication/action/${documentId}`, { action, comments }),
};
