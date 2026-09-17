import { api } from './client.js';

export const usersApi = {
  list: (role) => api.get(`/users/all${role ? `?role=${role}` : ''}`),
  getById: (userId) => api.get(`/users/${userId}`),
  updateMe: (patch) => api.put('/users/me', patch),
  changePassword: (currentPassword, newPassword) => api.put('/users/me/password', { currentPassword, newPassword }),
};
