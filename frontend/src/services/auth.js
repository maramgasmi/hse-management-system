// src/services/auth.js

import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

export const authService = {
  // Login
  login: async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}/token/`, {
      username,
      password,
    });
    
    const { access, refresh } = response.data;
    
    // Store tokens
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    
    // ✅ FIX: Don't call /users/me/ - just store username
    const user = {
      username: username,
      email: `${username}@example.com`,  // Placeholder
    };
    
    localStorage.setItem('user', JSON.stringify(user));
    
    return user;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
};