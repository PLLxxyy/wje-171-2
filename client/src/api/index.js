import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || { error: '请求失败' });
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me')
};

export const attendanceApi = {
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: (data) => api.post('/attendance/check-out', data),
  today: () => api.get('/attendance/today'),
  my: (month) => api.get('/attendance/my', { params: { month } })
};

export const fieldWorkApi = {
  create: (data) => api.post('/field-work', data),
  my: () => api.get('/field-work/my'),
  team: (params) => api.get('/field-work/team', { params }),
  review: (id, status) => api.put(`/field-work/${id}/review`, { status })
};

export const supervisorApi = {
  teamToday: () => api.get('/supervisor/team-today'),
  teamStats: (month) => api.get('/supervisor/team-stats', { params: { month } }),
  fieldStats: (month) => api.get('/supervisor/field-stats', { params: { month } })
};

export const adminApi = {
  departmentRanking: (month) => api.get('/admin/department-ranking', { params: { month } }),
  lateTrend: () => api.get('/admin/late-trend'),
  fieldDistribution: (month) => api.get('/admin/field-distribution', { params: { month } }),
  exportMonthly: (month) => api.get('/admin/export/monthly', { params: { month } }),
  exportField: (month) => api.get('/admin/export/field', { params: { month } }),
  users: () => api.get('/admin/users'),
  departments: () => api.get('/admin/departments')
};

export const officeApi = {
  list: () => api.get('/offices'),
  create: (data) => api.post('/offices', data),
  update: (id, data) => api.put(`/offices/${id}`, data),
  remove: (id) => api.delete(`/offices/${id}`)
};

export const abnormalAttendanceApi = {
  list: (params) => api.get('/abnormal-attendance', { params }),
  review: (id, status) => api.put(`/abnormal-attendance/${id}/review`, { status })
};

export default api;
