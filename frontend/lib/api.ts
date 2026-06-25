import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor to attach token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const authData = localStorage.getItem('proctor-ai-auth');
    if (authData) {
      const { state } = JSON.parse(authData);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    }
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      
      const authData = localStorage.getItem('proctor-ai-auth');
      if (authData) {
        const { state } = JSON.parse(authData);
        if (state?.refreshToken) {
          try {
            const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: state.refreshToken
            });
            // Update stored token
            const updated = { ...state, accessToken: data.access_token };
            localStorage.setItem('proctor-ai-auth', JSON.stringify({ state: updated }));
            original.headers.Authorization = `Bearer ${data.access_token}`;
            return api(original);
          } catch {
            localStorage.removeItem('proctor-ai-auth');
            window.location.href = '/auth/login';
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (data: any) =>
    api.post('/auth/register', data),
  
  registerFace: (imageBase64: string) =>
    api.post('/auth/register-face', { image_base64: imageBase64 }),
  
  verifyFace: (imageBase64: string) =>
    api.post('/auth/verify-face', { image_base64: imageBase64 }),
  
  getMe: () =>
    api.get('/auth/me'),
};

// Exam APIs
export const examAPI = {
  list: (params?: any) => api.get('/exams', { params }),
  get: (id: string) => api.get(`/exams/${id}`),
  create: (data: any) => api.post('/exams', data),
  startSession: (examId: string) => api.post(`/exams/${examId}/start-session`),
  completeSession: (examId: string, sessionId: string) =>
    api.post(`/exams/${examId}/sessions/${sessionId}/complete`),
  getSessions: (examId: string) => api.get(`/exams/${examId}/sessions`),
};

// Monitoring APIs
export const monitoringAPI = {
  getActiveSessions: () => api.get('/monitoring/active-sessions'),
  getSessionDetails: (sessionId: string) => api.get(`/monitoring/session/${sessionId}`),
};

// Alert APIs
export const alertAPI = {
  list: (params?: any) => api.get('/alerts', { params }),
  getStats: () => api.get('/alerts/stats'),
  review: (id: string, action: string) => api.patch(`/alerts/${id}/review`, { action }),
};

// Analytics APIs
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getSuspicionTrend: () => api.get('/analytics/suspicion-trend'),
};

// Student APIs
export const studentAPI = {
  list: (params?: any) => api.get('/students', { params }),
  getSessions: (studentId: string) => api.get(`/students/${studentId}/sessions`),
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
};

export default api;
