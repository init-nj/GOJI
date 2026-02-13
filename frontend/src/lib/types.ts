// Core Types for GOJI Application

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: 'admin' | 'user' | 'manager';
  is_active: boolean;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  currency: string;
  financial_year_start: number;
  default_working_days: number;
  total_budget?: number;
  monthly_budget_limit?: number;
  logo_url?: string;
}

export interface Employee {
  id: string;
  user_id: string;
  employee_id: string;
  designation: string;
  department: string;
  base_salary: number;
  currency: string;
  date_of_joining: string;
  employment_type: 'full_time' | 'part_time' | 'contract';
  is_active: boolean;
  bank_name?: string;
  account_number?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
}

export interface Expense {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  vendor_name?: string;
  payment_method?: string;
  expense_date: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  is_anomaly: boolean;
  ai_confidence?: number;
  ai_category_suggestion?: string;
  ocr_data?: OCRData;
  created_at: string;
}

export interface OCRData {
  amount: number;
  date: string;
  vendor: string;
  items?: Array<{ description: string; amount: number }>;
  tax?: number;
  confidence: {
    amount: number;
    date: number;
    vendor: number;
    overall: number;
  };
}

export interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  yearly_limit: number;
  year: number;
  alert_threshold: number;
  is_active: boolean;
}

export interface Revenue {
  id: string;
  month: number;
  year: number;
  amount: number;
  source: 'operations' | 'funding' | 'investment' | 'other';
  notes?: string;
  created_at: string;
}

export interface Payroll {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  base_salary: number;
  overtime_hours: number;
  overtime_pay: number;
  bonus: number;
  allowances: number;
  gross_salary: number;
  tax: number;
  insurance: number;
  provident_fund: number;
  loan_repayment: number;
  other_deductions: number;
  total_deductions: number;
  paid_leaves: number;
  unpaid_leaves: number;
  leave_deduction: number;
  net_salary: number;
  status: 'draft' | 'processed' | 'paid';
  created_at: string;
  processed_at?: string;
}

export interface FinancialInsight {
  overall_score: number;
  expense_health: number;
  payroll_health: number;
  budget_adherence: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  insights: string[];
}

export interface CashFlowPrediction {
  month: string;
  predicted_expenses: number;
  confidence_interval: [number, number];
  budget: number;
  likely_overrun: boolean;
}

export interface SpendingPattern {
  type: 'increase' | 'decrease' | 'stable' | 'anomaly';
  category: string;
  change: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Alert {
  id: string;
  type: 'budget' | 'anomaly' | 'approval' | 'payroll' | 'prediction';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action_label?: string;
  action_url?: string;
  created_at: string;
  is_read: boolean;
}
