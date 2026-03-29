import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('lastro_token') || localStorage.getItem('creditostock_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  api.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401 && window.location.pathname !== '/login') {
        localStorage.removeItem('lastro_token');
        localStorage.removeItem('creditostock_token');
        window.location.href = '/login';
      }
      return Promise.reject(err);
    },
  );
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
};

// Dashboard
export const dashboardApi = {
  getStats: (branchId?: string) =>
    api.get('/calculations/dashboard', { params: { branchId } }).then((r) => r.data),
};

// Companies
export const companiesApi = {
  list: () => api.get('/companies').then((r) => r.data),
  get: (id: string) => api.get(`/companies/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/companies', data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/companies/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/companies/${id}`).then((r) => r.data),
};

// Branches
export const branchesApi = {
  list: (companyId?: string) => api.get('/branches', { params: { companyId } }).then((r) => r.data),
  get: (id: string) => api.get(`/branches/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/branches', data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/branches/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/branches/${id}`).then((r) => r.data),
};

// Users
export const usersApi = {
  list: (companyId?: string) => api.get('/users', { params: { companyId } }).then((r) => r.data),
  get: (id: string) => api.get(`/users/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/users', data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
};

// Products
export const productsApi = {
  list: (companyId?: string, search?: string) =>
    api.get('/products', { params: { companyId, search } }).then((r) => r.data),
  get: (id: string) => api.get(`/products/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/products', data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/products/${id}`, data).then((r) => r.data),
  createAlias: (productId: string, data: unknown) =>
    api.post(`/products/${productId}/aliases`, data).then((r) => r.data),
  deleteAlias: (aliasId: string) => api.delete(`/products/aliases/${aliasId}`).then((r) => r.data),
};

// Stock
export const stockApi = {
  list: (branchId?: string) => api.get('/stock', { params: { branchId } }).then((r) => r.data),
  getItems: (snapshotId: string, params?: { search?: string; page?: number; limit?: number }) =>
    api.get(`/stock/${snapshotId}/items`, { params }).then((r) => r.data),
  import: (formData: FormData) =>
    api.post('/stock/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
};

// NFe
export const nfeApi = {
  list: (params?: { branchId?: string; page?: number; limit?: number }) =>
    api.get('/nfe', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/nfe/${id}`).then((r) => r.data),
  importXmls: (formData: FormData) =>
    api.post('/nfe/import-xml', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
};

// Reconciliation
export const reconciliationApi = {
  list: (params?: { snapshotId?: string; page?: number; limit?: number }) =>
    api.get('/reconciliation', { params }).then((r) => r.data),
  get: (stockItemId: string) => api.get(`/reconciliation/${stockItemId}`).then((r) => r.data),
  manualLink: (stockItemId: string, data: unknown) =>
    api.post(`/reconciliation/${stockItemId}/manual-link`, data).then((r) => r.data),
  getStats: (snapshotId: string) =>
    api.get(`/reconciliation/stats/${snapshotId}`).then((r) => r.data),
  runMatching: (snapshotId: string) =>
    api.post(`/reconciliation/run-matching/${snapshotId}`).then((r) => r.data),
};

// Calculations
export const calculationsApi = {
  list: (branchId?: string, kind?: string) => api.get('/calculations', { params: { branchId, kind } }).then((r) => r.data),
  get: (id: string) => api.get(`/calculations/${id}`).then((r) => r.data),
  run: (data: unknown) => api.post('/calculations/run', data).then((r) => r.data),
};

// Issues
export const issuesApi = {
  list: (params?: { status?: string; severity?: string; page?: number; limit?: number }) =>
    api.get('/issues', { params }).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/issues/${id}`, data).then((r) => r.data),
};

// Dossiers
export const dossiersApi = {
  list: (branchId?: string) => api.get('/dossiers', { params: { branchId } }).then((r) => r.data),
  get: (id: string) => api.get(`/dossiers/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/dossiers', data).then((r) => r.data),
  approve: (id: string) => api.put(`/dossiers/${id}/approve`).then((r) => r.data),
  reject: (id: string) => api.put(`/dossiers/${id}/reject`).then((r) => r.data),
  exportUrl: (id: string) => `${API_URL}/dossiers/${id}/export`,
};

// Tax Rules
export const taxRulesApi = {
  list: (state?: string) => api.get('/tax-rules', { params: { state } }).then((r) => r.data),
  get: (id: string) => api.get(`/tax-rules/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/tax-rules', data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/tax-rules/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/tax-rules/${id}`).then((r) => r.data),
};

// Tax Transition Rules
export const taxTransitionApi = {
  listRules: (stateFrom?: string) => api.get('/tax-transition/rules', { params: { stateFrom } }).then((r) => r.data),
  getRule: (id: string) => api.get(`/tax-transition/rules/${id}`).then((r) => r.data),
  createRule: (data: unknown) => api.post('/tax-transition/rules', data).then((r) => r.data),
  updateRule: (id: string, data: unknown) => api.put(`/tax-transition/rules/${id}`, data).then((r) => r.data),
  deleteRule: (id: string) => api.delete(`/tax-transition/rules/${id}`).then((r) => r.data),
};

// Transition Credits
export const transitionCreditsApi = {
  list: (params?: { branchId?: string; status?: string; calculationId?: string; page?: number; limit?: number }) =>
    api.get('/transition-credits', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/transition-credits/${id}`).then((r) => r.data),
  getBalance: (branchId: string) => api.get(`/transition-credits/balance/${branchId}`).then((r) => r.data),
  adjust: (id: string, data: { amount: number; notes: string }) =>
    api.post(`/transition-credits/${id}/adjust`, data).then((r) => r.data),
  block: (id: string, data: { notes: string }) =>
    api.post(`/transition-credits/${id}/block`, data).then((r) => r.data),
};

// Transition Ledger
export const transitionLedgerApi = {
  list: (params?: { branchId?: string; lotId?: string; entryType?: string; page?: number; limit?: number }) =>
    api.get('/transition-ledger', { params }).then((r) => r.data),
};

// Audit
export const auditApi = {
  list: (params?: { companyId?: string; entity?: string; page?: number; limit?: number }) =>
    api.get('/audit', { params }).then((r) => r.data),
};
