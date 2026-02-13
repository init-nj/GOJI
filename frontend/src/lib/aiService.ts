// AI Service - Simulates AI features for GOJI

import type { Expense, CashFlowPrediction, SpendingPattern, FinancialInsight } from './types';

// Category keywords for AI categorization
const categoryKeywords = {
  marketing: ['ad', 'ads', 'marketing', 'campaign', 'social media', 'facebook', 'google ads', 'seo', 'ppc'],
  software: ['aws', 'cloud', 'saas', 'software', 'subscription', 'license', 'github', 'azure', 'heroku', 'digital ocean'],
  rent: ['rent', 'lease', 'office space', 'property', 'landlord'],
  utilities: ['electric', 'electricity', 'water', 'gas', 'internet', 'phone', 'utility'],
  travel: ['flight', 'hotel', 'airbnb', 'uber', 'lyft', 'airline', 'travel', 'transportation'],
  office_supplies: ['office', 'supplies', 'stationery', 'furniture', 'equipment', 'depot'],
  payroll: ['salary', 'wage', 'payroll', 'compensation'],
  other: [],
};

// Simulate OCR extraction from receipt image
export const extractReceiptData = async (imageFile: File): Promise<{
  success: boolean;
  extracted_data?: {
    amount: number;
    date: string;
    vendor: string;
    items?: Array<{ description: string; amount: number }>;
    tax?: number;
    currency: string;
    confidence: {
      amount: number;
      date: number;
      vendor: number;
      overall: number;
    };
  };
  image_url?: string;
  error?: string;
}> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mock OCR results (in real app, would call OCR API)
  const mockVendors = [
    'Amazon Web Services',
    'Google Ads',
    'Microsoft Azure',
    'Salesforce',
    'Office Depot',
    'Starbucks',
    'Delta Airlines',
    'Hilton Hotels',
  ];

  const vendor = mockVendors[Math.floor(Math.random() * mockVendors.length)];
  const amount = Math.floor(Math.random() * 5000) + 50;
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));

  // Create object URL for preview
  const imageUrl = URL.createObjectURL(imageFile);

  return {
    success: true,
    extracted_data: {
      amount,
      date: date.toISOString().split('T')[0],
      vendor,
      items: [
        { description: 'Service charge', amount: amount * 0.8 },
        { description: 'Additional fees', amount: amount * 0.2 },
      ],
      tax: null,
      currency: 'USD',
      confidence: {
        amount: Math.random() * 0.1 + 0.9, // 90-100%
        date: Math.random() * 0.1 + 0.85, // 85-95%
        vendor: Math.random() * 0.15 + 0.8, // 80-95%
        overall: Math.random() * 0.1 + 0.88, // 88-98%
      },
    },
    image_url: imageUrl,
  };
};

// AI-powered expense categorization
export const categorizeExpense = (title: string, description: string, amount: number): {
  category: string;
  confidence: number;
} => {
  const text = `${title} ${description}`.toLowerCase();

  let bestCategory = 'other';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (category === 'other') continue;

    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Calculate confidence based on keyword matches
  const confidence = bestScore > 0 ? Math.min(0.7 + bestScore * 0.1, 0.98) : 0.5;

  return {
    category: bestCategory,
    confidence,
  };
};

// Detect anomalies in expenses
export const detectAnomaly = (
  amount: number,
  category: string,
  historicalExpenses: Expense[]
): boolean => {
  // Get historical expenses in the same category
  const categoryExpenses = historicalExpenses.filter(e => e.category === category);

  if (categoryExpenses.length === 0) return false;

  // Calculate average and standard deviation
  const amounts = categoryExpenses.map(e => e.amount);
  const avg = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;

  const variance = amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Flag as anomaly if more than 2 standard deviations from mean
  return amount > avg + 2 * stdDev;
};

// Predict cash flow for upcoming months
export const predictCashFlow = (
  historicalExpenses: Expense[],
  monthlyBudget: number,
  monthsAhead: number = 3
): CashFlowPrediction[] => {
  // Group expenses by month
  const monthlyTotals: { [key: string]: number } = {};

  historicalExpenses.forEach(expense => {
    const date = new Date(expense.expense_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyTotals[key] = (monthlyTotals[key] || 0) + expense.amount;
  });

  // Calculate average and trend
  const totals = Object.values(monthlyTotals);
  const avg = totals.reduce((sum, val) => sum + val, 0) / totals.length;

  // Simple linear trend
  const trend = totals.length > 1 ? (totals[0] - totals[totals.length - 1]) / totals.length : 0;

  const predictions: CashFlowPrediction[] = [];
  const now = new Date();

  for (let i = 1; i <= monthsAhead; i++) {
    const futureDate = new Date(now);
    futureDate.setMonth(futureDate.getMonth() + i);

    const predicted = avg + trend * i;
    const margin = predicted * 0.15; // 15% confidence interval

    predictions.push({
      month: futureDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      predicted_expenses: Math.round(predicted),
      confidence_interval: [Math.round(predicted - margin), Math.round(predicted + margin)],
      budget: monthlyBudget,
      likely_overrun: predicted > monthlyBudget,
    });
  }

  return predictions;
};

// Analyze spending patterns
export const analyzeSpendingPatterns = (
  expenses: Expense[],
  monthsToAnalyze: number = 6
): SpendingPattern[] => {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsToAnalyze);

  const recentExpenses = expenses.filter(
    e => new Date(e.expense_date) >= cutoffDate
  );

  // Group by category and calculate trends
  const categoryTotals: { [key: string]: number[] } = {};

  recentExpenses.forEach(expense => {
    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = [];
    }
    categoryTotals[expense.category].push(expense.amount);
  });

  const patterns: SpendingPattern[] = [];

  Object.entries(categoryTotals).forEach(([category, amounts]) => {
    if (amounts.length < 3) return;

    const recent = amounts.slice(0, Math.floor(amounts.length / 2));
    const older = amounts.slice(Math.floor(amounts.length / 2));

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (Math.abs(changePercent) > 20) {
      const type = changePercent > 0 ? 'increase' : 'decrease';
      patterns.push({
        type,
        category,
        change: `${changePercent > 0 ? '+' : ''}${Math.round(changePercent)}%`,
        recommendation:
          type === 'increase'
            ? 'Review recent purchases and ROI'
            : 'Spending is decreasing, monitor for impact',
        priority: Math.abs(changePercent) > 40 ? 'high' : 'medium',
      });
    }
  });

  // Add stable categories
  const stableCategories = Object.keys(categoryTotals).filter(
    cat => !patterns.find(p => p.category === cat)
  );

  if (stableCategories.length > 0) {
    patterns.push({
      type: 'stable',
      category: stableCategories[0],
      change: '±5%',
      recommendation: 'Spending is stable and predictable',
      priority: 'low',
    });
  }

  return patterns;
};

// Calculate financial health score
export const calculateHealthScore = (
  expenses: Expense[],
  budgets: any[],
  pendingPayroll: number
): FinancialInsight => {
  // Component 1: Expense Health (40 points)
  const anomalyRate = expenses.filter(e => e.is_anomaly).length / Math.max(expenses.length, 1);
  const pendingRate = expenses.filter(e => e.status === 'pending').length / Math.max(expenses.length, 1);
  const expenseScore = Math.max(0, 40 - anomalyRate * 15 - pendingRate * 10);

  // Component 2: Payroll Health (30 points)
  const payrollScore = Math.max(0, 30 - pendingPayroll * 5);

  // Component 3: Budget Adherence (30 points)
  let budgetScore = 30;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const monthlyExpenses = expenses.filter(e => {
    const date = new Date(e.expense_date);
    return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
  });

  budgets.forEach(budget => {
    const categoryExpenses = monthlyExpenses.filter(e => e.category === budget.category);
    const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);

    if (total > budget.monthly_limit) {
      budgetScore -= 10;
    }
  });

  budgetScore = Math.max(0, budgetScore);

  // Total (0-100)
  const total = expenseScore + payrollScore + budgetScore;
  const scoreOutOf10 = total / 10;

  const grade =
    scoreOutOf10 >= 9 ? 'A' :
    scoreOutOf10 >= 7 ? 'B' :
    scoreOutOf10 >= 5 ? 'C' :
    scoreOutOf10 >= 3 ? 'D' : 'F';

  const insights: string[] = [];

  if (anomalyRate > 0.1) {
    insights.push('High number of unusual expenses detected');
  }
  if (pendingRate > 0.2) {
    insights.push('Many expenses pending approval');
  }
  if (budgetScore < 20) {
    insights.push('Multiple budget categories exceeded');
  }
  if (scoreOutOf10 >= 7) {
    insights.push('Overall financial health is good');
  }

  return {
    overall_score: Number(scoreOutOf10.toFixed(1)),
    expense_health: Number((expenseScore / 4).toFixed(1)),
    payroll_health: Number((payrollScore / 3).toFixed(1)),
    budget_adherence: Number((budgetScore / 3).toFixed(1)),
    grade,
    insights,
  };
};
