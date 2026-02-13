// Mock data generator and storage utilities

import type {
  User,
  Employee,
  Expense,
  Budget,
  Revenue,
  Payroll,
  CompanySettings,
} from './types';

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'goji_auth_token',
  CURRENT_USER: 'goji_current_user',
  COMPANY_SETTINGS: 'goji_company_settings',
  EMPLOYEES: 'goji_employees',
  EXPENSES: 'goji_expenses',
  BUDGETS: 'goji_budgets',
  REVENUE: 'goji_revenue',
  PAYROLL: 'goji_payroll',
  ONBOARDING_COMPLETE: 'goji_onboarding_complete',
} as const;

// Generate mock users
export const generateMockUsers = (): User[] => [
  {
    id: '1',
    username: 'admin',
    email: 'admin@goji.com',
    first_name: 'Admin',
    last_name: 'User',
    phone_number: '+1234567890',
    role: 'admin',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
];

// Generate mock employees
export const generateMockEmployees = (): Employee[] => [
  {
    id: '1',
    user_id: '1',
    employee_id: 'EMP001',
    designation: 'CEO',
    department: 'Executive',
    base_salary: 8500,
    currency: 'USD',
    date_of_joining: '2025-01-01',
    employment_type: 'full_time',
    is_active: true,
    bank_name: 'Chase Bank',
    account_number: '****1234',
  },
  {
    id: '2',
    user_id: '2',
    employee_id: 'EMP002',
    designation: 'CTO',
    department: 'Engineering',
    base_salary: 7500,
    currency: 'USD',
    date_of_joining: '2025-01-15',
    employment_type: 'full_time',
    is_active: true,
  },
  {
    id: '3',
    user_id: '3',
    employee_id: 'EMP003',
    designation: 'Senior Developer',
    department: 'Engineering',
    base_salary: 6000,
    currency: 'USD',
    date_of_joining: '2025-02-01',
    employment_type: 'full_time',
    is_active: true,
  },
];

// Generate mock expenses
export const generateMockExpenses = (): Expense[] => {
  const now = new Date();
  const categories = ['marketing', 'software', 'rent', 'utilities', 'travel', 'office_supplies'];
  const vendors = [
    'Amazon Web Services',
    'Google Ads',
    'Office Landlord LLC',
    'Electric Company',
    'Delta Airlines',
    'Office Depot',
  ];

  const expenses: Expense[] = [];

  // Generate expenses for the last 6 months
  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    const expenseDate = new Date(now);
    expenseDate.setMonth(expenseDate.getMonth() - monthOffset);

    // 5-10 expenses per month
    const count = Math.floor(Math.random() * 6) + 5;

    for (let i = 0; i < count; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const vendor = vendors[Math.floor(Math.random() * vendors.length)];
      const amount = Math.floor(Math.random() * 5000) + 100;

      expenses.push({
        id: `exp-${monthOffset}-${i}`,
        title: `${vendor} - ${expenseDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
        description: `Payment for ${category} services`,
        amount,
        currency: 'USD',
        category,
        vendor_name: vendor,
        payment_method: 'credit_card',
        expense_date: expenseDate.toISOString().split('T')[0],
        status: monthOffset > 0 ? 'approved' : Math.random() > 0.3 ? 'approved' : 'pending',
        created_by: '1',
        is_anomaly: amount > 4000,
        ai_confidence: Math.random() * 0.3 + 0.7,
        ai_category_suggestion: category,
        created_at: expenseDate.toISOString(),
      });
    }
  }

  return expenses;
};

// Generate mock budgets
export const generateMockBudgets = (): Budget[] => [
  {
    id: '1',
    category: 'marketing',
    monthly_limit: 5000,
    yearly_limit: 60000,
    year: 2026,
    alert_threshold: 80,
    is_active: true,
  },
  {
    id: '2',
    category: 'software',
    monthly_limit: 3000,
    yearly_limit: 36000,
    year: 2026,
    alert_threshold: 80,
    is_active: true,
  },
  {
    id: '3',
    category: 'rent',
    monthly_limit: 3000,
    yearly_limit: 36000,
    year: 2026,
    alert_threshold: 80,
    is_active: true,
  },
  {
    id: '4',
    category: 'utilities',
    monthly_limit: 500,
    yearly_limit: 6000,
    year: 2026,
    alert_threshold: 80,
    is_active: true,
  },
  {
    id: '5',
    category: 'payroll',
    monthly_limit: 8000,
    yearly_limit: 96000,
    year: 2026,
    alert_threshold: 80,
    is_active: true,
  },
];

// Generate mock revenue
export const generateMockRevenue = (): Revenue[] => {
  const revenue: Revenue[] = [];
  const now = new Date();

  for (let i = 0; i < 6; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);

    revenue.push({
      id: `rev-${i}`,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      amount: Math.floor(Math.random() * 10000) + 20000,
      source: 'operations',
      notes: 'Monthly revenue',
      created_at: date.toISOString(),
    });
  }

  return revenue;
};

// Generate mock payroll
export const generateMockPayroll = (): Payroll[] => {
  const employees = generateMockEmployees();
  const payroll: Payroll[] = [];
  const now = new Date();

  employees.forEach((emp, empIndex) => {
    // Last 3 months
    for (let i = 0; i < 3; i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);

      const overtimeHours = Math.floor(Math.random() * 10);
      const overtimePay = overtimeHours * (emp.base_salary / 176) * 1.5;
      const bonus = i === 0 ? Math.floor(Math.random() * 1000) : 0;
      const allowances = 200;
      const grossSalary = emp.base_salary + overtimePay + bonus + allowances;

      const tax = grossSalary * 0.15;
      const insurance = 150;
      const providentFund = grossSalary * 0.08;
      const totalDeductions = tax + insurance + providentFund;

      const netSalary = grossSalary - totalDeductions;

      payroll.push({
        id: `pay-${empIndex}-${i}`,
        employee_id: emp.id,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        base_salary: emp.base_salary,
        overtime_hours: overtimeHours,
        overtime_pay: overtimePay,
        bonus,
        allowances,
        gross_salary: grossSalary,
        tax,
        insurance,
        provident_fund: providentFund,
        loan_repayment: 0,
        other_deductions: 0,
        total_deductions: totalDeductions,
        paid_leaves: 0,
        unpaid_leaves: 0,
        leave_deduction: 0,
        net_salary: netSalary,
        status: i > 0 ? 'paid' : i === 0 ? 'processed' : 'draft',
        created_at: date.toISOString(),
        processed_at: i === 0 ? date.toISOString() : undefined,
      });
    }
  });

  return payroll;
};

// Default company settings
export const defaultCompanySettings: CompanySettings = {
  id: '1',
  company_name: 'My Startup',
  currency: 'USD',
  financial_year_start: 1,
  default_working_days: 22,
  total_budget: 200000,
  monthly_budget_limit: 20000,
};

// Initialize local storage with mock data
export const initializeMockData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(generateMockExpenses()));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(generateMockEmployees()));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BUDGETS)) {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(generateMockBudgets()));
  }
  if (!localStorage.getItem(STORAGE_KEYS.REVENUE)) {
    localStorage.setItem(STORAGE_KEYS.REVENUE, JSON.stringify(generateMockRevenue()));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PAYROLL)) {
    localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(generateMockPayroll()));
  }
};

// Get data from local storage
export const getStorageData = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// Save data to local storage
export const setStorageData = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};
