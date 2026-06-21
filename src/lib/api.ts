const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  try {
    const saved = localStorage.getItem('payroll_user');
    if (saved) {
      const u = JSON.parse(saved);
      return {
        'x-user-email': u.email || '',
        'x-user-id': u.id || '',
        'x-user-role': u.role || '',
      };
    }
  } catch (e) {
    console.error(e);
  }
  return {};
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const authHeaders = getAuthHeaders();
  const headers = {
    ...options.headers,
    ...authHeaders,
  };
  return fetch(url, { ...options, headers });
}

async function handleResponse(res: Response) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return {};
  }
  
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const res = await fetchWithAuth(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse(res);
    },
  },
  employees: {
    list: async () => {
      const res = await fetchWithAuth(`${API_BASE}/employees`);
      return handleResponse(res);
    },
    create: async (data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    bulkCreate: async (employees: any[]) => {
      const res = await fetchWithAuth(`${API_BASE}/employees/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees }),
      });
      return handleResponse(res);
    },
    update: async (id: string, data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id: string) => {
      const res = await fetchWithAuth(`${API_BASE}/employees/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    deleteAll: async () => {
      const res = await fetchWithAuth(`${API_BASE}/employees/delete/all`, { method: 'DELETE' });
      return handleResponse(res);
    },
    getPayrollHistory: async (id: string) => {
      const res = await fetchWithAuth(`${API_BASE}/employees/${id}/payroll-history`);
      return handleResponse(res);
    },
    getDeductionHistory: async (id: string) => {
      const res = await fetchWithAuth(`${API_BASE}/employees/${id}/deduction-history`);
      return handleResponse(res);
    },
    listCategories: async () => {
      const res = await fetchWithAuth(`${API_BASE}/employee-categories`);
      return handleResponse(res);
    },
    createCategory: async (data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/employee-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    updateCategory: async (id: string, data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/employee-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    deleteCategory: async (id: string) => {
      const res = await fetchWithAuth(`${API_BASE}/employee-categories/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    listPositions: async () => {
      const res = await fetchWithAuth(`${API_BASE}/employee-positions`);
      return handleResponse(res);
    },
    createPosition: async (data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/employee-positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    updatePosition: async (id: string, data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/employee-positions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    deletePosition: async (id: string) => {
      const res = await fetchWithAuth(`${API_BASE}/employee-positions/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    },
  },
  schedules: {
    list: async () => {
      const res = await fetchWithAuth(`${API_BASE}/schedules`);
      return handleResponse(res);
    },
    getByEmployee: async (id: string) => {
      const res = await fetchWithAuth(`${API_BASE}/schedules/employee/${id}`);
      return handleResponse(res);
    },
    create: async (data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id: string, data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id: string) => {
      const res = await fetchWithAuth(`${API_BASE}/schedules/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    },
  },
  deductions: {
    list: async () => {
      const res = await fetchWithAuth(`${API_BASE}/deductions`);
      return handleResponse(res);
    },
    create: async (data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/deductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id: string, data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/deductions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id: string) => {
      const res = await fetchWithAuth(`${API_BASE}/deductions/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    listTypes: async () => {
      const res = await fetchWithAuth(`${API_BASE}/deduction-types`);
      return handleResponse(res);
    },
    createType: async (data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/deduction-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    updateType: async (id: string, data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/deduction-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    deleteType: async (id: string) => {
      const res = await fetchWithAuth(`${API_BASE}/deduction-types/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    importBulk: async (data: any[]) => {
      const res = await fetchWithAuth(`${API_BASE}/deductions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    deleteByEmployee: async (employeeId: string) => {
      const res = await fetchWithAuth(`${API_BASE}/deductions/employee/${employeeId}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    clearAll: async () => {
      const res = await fetchWithAuth(`${API_BASE}/deductions`, { method: 'DELETE' });
      return handleResponse(res);
    },
  },
  payroll: {
    listCycles: async () => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-cycles`);
      return handleResponse(res);
    },
    createCycle: async (data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-cycles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    getEntries: async (cycleId: string) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-cycles/${cycleId}/entries`);
      return handleResponse(res);
    },
    updateEntry: async (entryId: string, data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    deleteEntry: async (entryId: string) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-entries/${entryId}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    addEmployee: async (cycleId: string, employeeId: string) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-cycles/${cycleId}/add-employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      });
      return handleResponse(res);
    },
    process: async (cycleId: string) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-cycles/${cycleId}/process`, { method: 'POST' });
      return handleResponse(res);
    },
    revert: async (cycleId: string) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-cycles/${cycleId}/revert`, { method: 'POST' });
      return handleResponse(res);
    },
    disburse: async (cycleId: string) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-cycles/${cycleId}/disburse`, { method: 'POST' });
      return handleResponse(res);
    },
    deleteCycle: async (cycleId: string) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-cycles/${cycleId}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    getMyPayroll: async (email: string) => {
      const res = await fetchWithAuth(`${API_BASE}/my-payroll?email=${encodeURIComponent(email)}`);
      return handleResponse(res);
    },
    getMySmsLogs: async (email: string) => {
      const res = await fetchWithAuth(`${API_BASE}/my-sms-logs?email=${encodeURIComponent(email)}`);
      return handleResponse(res);
    },
    approve: async (cycleId: string) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-cycles/${cycleId}/approve`, { method: 'POST' });
      return handleResponse(res);
    },
    reject: async (cycleId: string) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-cycles/${cycleId}/reject`, { method: 'POST' });
      return handleResponse(res);
    },
    validateEntry: async (entryId: string, isValidated: boolean) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-entries/${entryId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isValidated }),
      });
      return handleResponse(res);
    },
    importDeductions: async (cycleId: string, updates: any[]) => {
      const res = await fetchWithAuth(`${API_BASE}/payroll-cycles/${cycleId}/import-deductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return handleResponse(res);
    },
  },
  history: {
    list: async () => {
      const res = await fetchWithAuth(`${API_BASE}/history`);
      return handleResponse(res);
    },
  },
  users: {
    list: async () => {
      const res = await fetchWithAuth(`${API_BASE}/users`);
      return handleResponse(res);
    },
    create: async (data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id: string, data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id: string) => {
      const res = await fetchWithAuth(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    },
  },
  profile: {
    get: async (email: string) => {
      const res = await fetchWithAuth(`${API_BASE}/profile?email=${encodeURIComponent(email)}`);
      return handleResponse(res);
    },
    update: async (data: any) => {
      const res = await fetchWithAuth(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },
  reports: {
    getFinancial: async () => {
      const res = await fetchWithAuth(`${API_BASE}/reports/financial`);
      return handleResponse(res);
    },
  },
  audit: {
    list: async () => {
      const res = await fetchWithAuth(`${API_BASE}/audit-logs`);
      return handleResponse(res);
    },
  },
};
