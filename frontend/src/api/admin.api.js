import { api } from './client.js';

export const adminApi = {
  listUsers: () => api.get('/admin/all'),
  listRoles: () => api.get('/admin/roles'),
  getUser: (userId) => api.get(`/admin/${userId}`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (userId, patch) => api.put(`/admin/${userId}`, patch),
  updateRole: (userId, role) => api.put(`/admin/role/${userId}`, { role }),
  deleteUser: (userId) => api.delete(`/admin/${userId}`),
};
