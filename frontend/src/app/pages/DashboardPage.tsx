import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import AppLayout from '../components/AppLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Users,
  DollarSign,
  Receipt,
  Heart,
  Wallet,
  Calendar,
  TrendingUp,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Brain,
  CheckCircle2,
} from 'lucide-react';
import { getStorageData, STORAGE_KEYS } from '../../lib/mockData';
import { calculateHealthScore, predictCashFlow, analyzeSpendingPatterns } from '../../lib/aiService';
import type { Expense, Employee, Payroll, Budget, CompanySettings } from '../../lib/types';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    // Load data
    setExpenses(getStorageData<Expense[]>(STORAGE_KEYS.EXPENSES, []));
    setEmployees(getStorageData<Employee[]>(STORAGE_KEYS.EMPLOYEES, []));
    setPayroll(getStorageData<Payroll[]>(STORAGE_KEYS.PAYROLL, []));
    setBudgets(getStorageData<Budget[]>(STORAGE_KEYS.BUDGETS, []));
    setSettings(getStorageData<CompanySettings | null>(STORAGE_KEYS.COMPANY_SETTINGS, null));
  }, []);

  // Calculate metrics
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const monthlyExpenses = expenses.filter(e => {
    const date = new Date(e.expense_date);
    return (
      date.getMonth() + 1 === currentMonth &&
      date.getFullYear() === currentYear &&
      e.status === 'approved'
    );
  });

  const totalMonthlyExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const monthlyPayroll = payroll.filter(
    p => p.month === currentMonth && p.year === currentYear && p.status === 'paid'
  );

  const totalMonthlyPayroll = monthlyPayroll.reduce((sum, p) => sum + p.net_salary, 0);

  const activeEmployees = employees.filter(e => e.is_active).length;

  const monthlyBudgetLimit = settings?.monthly_budget_limit || 20000;
  const totalBudget = settings?.total_budget || 200000;

  const totalSpent = totalMonthlyExpenses + totalMonthlyPayroll;
  const budgetUsedPercent = (totalSpent / monthlyBudgetLimit) * 100;

  // Calculate remaining budget
  const allTimeExpenses = expenses
    .filter(e => e.status === 'approved')
    .reduce((sum, e) => sum + e.amount, 0);
  const allTimePayroll = payroll
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.net_salary, 0);
  const totalAllTimeSpent = allTimeExpenses + allTimePayroll;
  const remainingBudget = totalBudget - totalAllTimeSpent;

  // Calculate runway
  const avgMonthlyBurn = totalSpent || 15000;
  const runwayMonths = remainingBudget / avgMonthlyBurn;

  // Health score
  const pendingPayrollCount = payroll.filter(p => p.status === 'draft').length;
  const healthScore = calculateHealthScore(expenses, budgets, pendingPayrollCount);

  // Cash flow prediction
  const predictions = predictCashFlow(expenses, monthlyBudgetLimit, 3);

  // Spending patterns
  const patterns = analyzeSpendingPatterns(expenses, 6);

  // Category breakdown
  const categoryData = Object.entries(
    monthlyExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

  // Spending vs budget over time (last 6 months)
  const spendingTrendData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleDateString('en-US', { month: 'short' });

    const monthExpenses = expenses.filter(e => {
      const ed = new Date(e.expense_date);
      return (
        ed.getMonth() === d.getMonth() &&
        ed.getFullYear() === d.getFullYear() &&
        e.status === 'approved'
      );
    });

    const monthPayroll = payroll.filter(
      p => p.month === d.getMonth() + 1 && p.year === d.getFullYear() && p.status === 'paid'
    );

    return {
      month,
      spending: monthExpenses.reduce((sum, e) => sum + e.amount, 0) +
        monthPayroll.reduce((sum, p) => sum + p.net_salary, 0),
      budget: monthlyBudgetLimit,
    };
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Budget Overview Banner */}
        <Card className="p-6 bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF6B6B]/5">
          <h2 className="text-lg font-bold mb-4">Budget Overview</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {/* Total Budget */}
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Wallet className="w-4 h-4" />
                Total Budget
              </div>
              <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
              <div className="text-sm text-gray-600 mt-1">
                Remaining: ${remainingBudget.toLocaleString()}
              </div>
              <Progress
                value={(remainingBudget / totalBudget) * 100}
                className="mt-2 h-2"
              />
            </div>

            {/* This Month */}
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Calendar className="w-4 h-4" />
                February Spending
              </div>
              <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
              <div className="text-sm text-gray-600 mt-1">
                Budget: ${monthlyBudgetLimit.toLocaleString()}
              </div>
              <Progress
                value={budgetUsedPercent}
                className="mt-2 h-2"
              />
              {budgetUsedPercent > 90 && (
                <div className="text-xs text-amber-600 mt-1">⚠️ Close to monthly limit</div>
              )}
            </div>

            {/* Revenue vs Expenses */}
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                Net Cash Flow
              </div>
              <div className="text-2xl font-bold text-green-600">
                +${(monthlyBudgetLimit - totalSpent).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">This month</div>
              <div className="text-xs text-green-600 mt-2">💚 Positive cash flow</div>
            </div>

            {/* Runway */}
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Calendar className="w-4 h-4" />
                Runway
              </div>
              <div className="text-2xl font-bold">{runwayMonths.toFixed(1)} months</div>
              <div className="text-sm text-gray-600 mt-1">
                At ${avgMonthlyBurn.toLocaleString()}/mo
              </div>
              <div
                className={`text-xs mt-2 ${
                  runwayMonths > 6 ? 'text-green-600' : 'text-amber-600'
                }`}
              >
                {runwayMonths > 6 ? '✓ Healthy runway' : '⚠️ Monitor closely'}
              </div>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          {/* Active Employees */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-3xl font-bold mb-1">{activeEmployees}</div>
            <div className="text-sm text-gray-600">Active Employees</div>
            <div className="text-xs text-green-600 mt-2">+2 this month</div>
          </Card>

          {/* Monthly Payroll */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-3xl font-bold mb-1">${totalMonthlyPayroll.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Payroll This Month</div>
            <div className="text-xs text-gray-500 mt-2">
              87% of planned
            </div>
          </Card>

          {/* Monthly Expenses */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Receipt className="w-6 h-6 text-amber-600" />
              </div>
              <ArrowDown className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-3xl font-bold mb-1">${totalMonthlyExpenses.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Other Expenses</div>
            <div className="text-xs text-green-600 mt-2">-2% from last month</div>
          </Card>

          {/* Financial Health */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-200 rounded-lg">
                <Heart className="w-6 h-6 text-green-700" />
              </div>
              <Badge variant="outline" className="bg-white">
                Grade {healthScore.grade}
              </Badge>
            </div>
            <div className="text-3xl font-bold mb-1 text-green-700">
              {healthScore.overall_score}/10
            </div>
            <div className="text-sm text-green-700 font-medium">Health Score</div>
            <div className="text-xs text-green-600 mt-2">Good financial health</div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Spending vs Budget */}
          <Card className="p-6">
            <h3 className="font-bold mb-4">Spending vs Budget (Last 6 Months)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={spendingTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="spending" stroke="#FF6B6B" name="Actual Spending" />
                <Line
                  type="monotone"
                  dataKey="budget"
                  stroke="#10B981"
                  strokeDasharray="5 5"
                  name="Budget Limit"
                />
              </LineChart>
            </ResponsiveContainer>
            {budgetUsedPercent > 80 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm">
                <span className="text-amber-700">
                  ⚠️ You've used {budgetUsedPercent.toFixed(0)}% of your monthly budget
                </span>
              </div>
            )}
          </Card>

          {/* Expense Categories */}
          <Card className="p-6">
            <h3 className="font-bold mb-4">Expense Categories</h3>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={entry => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                No expense data for this month
              </div>
            )}
          </Card>
        </div>

        {/* Cash Flow Prediction */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-[#FF6B6B]" />
            <h3 className="font-bold">AI Cash Flow Prediction</h3>
            <Badge variant="outline" className="ml-auto">Next 3 Months</Badge>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {predictions.map((pred, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border-2 ${
                  pred.likely_overrun ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'
                }`}
              >
                <div className="text-sm font-medium text-gray-600 mb-1">{pred.month}</div>
                <div className="text-xl font-bold mb-2">
                  ${pred.predicted_expenses.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  Budget: ${pred.budget.toLocaleString()}
                </div>
                {pred.likely_overrun ? (
                  <div className="text-xs text-amber-700 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Likely overrun by ${(pred.predicted_expenses - pred.budget).toLocaleString()}
                  </div>
                ) : (
                  <div className="text-xs text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Within budget
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => navigate('/budget')}
          >
            Adjust Budget
          </Button>
        </Card>

        {/* AI Insights */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-[#FF6B6B]" />
            <h3 className="font-bold">AI Spending Insights</h3>
          </div>

          <div className="space-y-3">
            {patterns.length > 0 ? (
              patterns.map((pattern, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                >
                  <div className="mt-1">
                    {pattern.type === 'increase' && <ArrowUp className="w-4 h-4 text-amber-600" />}
                    {pattern.type === 'decrease' && <ArrowDown className="w-4 h-4 text-green-600" />}
                    {pattern.type === 'stable' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {pattern.category} costs {pattern.change}
                    </div>
                    <div className="text-sm text-gray-600">{pattern.recommendation}</div>
                  </div>
                  <Badge variant={pattern.priority === 'high' ? 'destructive' : 'secondary'}>
                    {pattern.priority}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                Not enough data yet. Keep tracking expenses to see AI insights.
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Button
            className="h-auto py-4 bg-[#FF6B6B] hover:bg-[#FF5252]"
            onClick={() => navigate('/expenses')}
          >
            <Receipt className="w-5 h-5 mr-2" />
            Add Expense
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4"
            onClick={() => navigate('/payroll')}
          >
            <DollarSign className="w-5 h-5 mr-2" />
            Process Payroll
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4"
            onClick={() => navigate('/reports')}
          >
            <Receipt className="w-5 h-5 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
