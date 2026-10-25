import apiRequest from './api';

const authService = {
  async login(username, password) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
      }),
    });
  },

  async getCurrentUser() {
    return apiRequest('/auth/me', {
      method: 'GET',
    });
  },

  async logout() {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },
};

export default authService;