import { api, apiRequest } from './client.js';

export const authApi = {
  register: (data) => apiRequest('/auth/register', { method: 'POST', body: data, auth: false }),
  login: (data) => apiRequest('/auth/login', { method: 'POST', body: data, auth: false }),
  logout: (refreshToken) => apiRequest('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
  forgotPassword: (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (token, newPassword) =>
    apiRequest('/auth/reset-password', { method: 'POST', body: { token, newPassword }, auth: false }),
  profile: () => api.get('/auth/profile'),
};
