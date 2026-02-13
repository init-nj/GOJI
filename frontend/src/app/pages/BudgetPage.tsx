import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Wallet, Calendar, TrendingUp, Edit, Plus } from 'lucide-react';
import { getStorageData, setStorageData, STORAGE_KEYS } from '../../lib/mockData';
import type { Budget, CompanySettings, Expense, Revenue } from '../../lib/types';
import { toast } from 'sonner';

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setBudgets(getStorageData<Budget[]>(STORAGE_KEYS.BUDGETS, []));
    setSettings(getStorageData<CompanySettings | null>(STORAGE_KEYS.COMPANY_SETTINGS, null));
    setExpenses(getStorageData<Expense[]>(STORAGE_KEYS.EXPENSES, []));
    setRevenue(getStorageData<Revenue[]>(STORAGE_KEYS.REVENUE, []));
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Calculate monthly spending by category
  const monthlyExpenses = expenses.filter(e => {
    const date = new Date(e.expense_date);
    return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
  });

  const categorySpending = monthlyExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  // Calculate totals
  const totalBudget = settings?.total_budget || 0;
  const monthlyLimit = settings?.monthly_budget_limit || 0;
  const totalMonthlySpent = Object.values(categorySpending).reduce((sum, val) => sum + val, 0);
  const remainingBudget = totalBudget - totalMonthlySpent * 12; // Simplified

  // Revenue calculations
  const currentMonthRevenue = revenue.find(r => r.month === currentMonth && r.year === currentYear);
  const last3MonthsRevenue = revenue
    .filter(r => {
      const months = Array.from({ length: 3 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return { month: d.getMonth() + 1, year: d.getFullYear() };
      });
      return months.some(m => m.month === r.month && m.year === r.year);
    })
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Budget & Revenue</h1>
            <p className="text-gray-600">Manage your organization's budget and revenue</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Budget
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Budget</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Total Budget</Label>
                    <Input
                      type="number"
                      defaultValue={totalBudget}
                      placeholder="200000"
                    />
                  </div>
                  <div>
                    <Label>Monthly Limit</Label>
                    <Input
                      type="number"
                      defaultValue={monthlyLimit}
                      placeholder="20000"
                    />
                  </div>
                  <Button
                    className="w-full bg-[#FF6B6B] hover:bg-[#FF5252]"
                    onClick={() => {
                      toast.success('Budget updated successfully');
                      setEditDialogOpen(false);
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Wallet className="w-4 h-4" />
              Total Budget
            </div>
            <div className="text-3xl font-bold mb-1">${totalBudget.toLocaleString()}</div>
            <div className="text-sm text-gray-600">
              Remaining: ${remainingBudget.toLocaleString()}
            </div>
            <Progress value={(remainingBudget / totalBudget) * 100} className="mt-3 h-2" />
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Calendar className="w-4 h-4" />
              Monthly Budget
            </div>
            <div className="text-3xl font-bold mb-1">${monthlyLimit.toLocaleString()}</div>
            <div className="text-sm text-gray-600">
              Spent: ${totalMonthlySpent.toLocaleString()}
            </div>
            <Progress value={(totalMonthlySpent / monthlyLimit) * 100} className="mt-3 h-2" />
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <TrendingUp className="w-4 h-4" />
              This Month Revenue
            </div>
            <div className="text-3xl font-bold mb-1">
              ${(currentMonthRevenue?.amount || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">
              Last 3 months: ${last3MonthsRevenue.toLocaleString()}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <TrendingUp className="w-4 h-4" />
              Net Position
            </div>
            <div className="text-3xl font-bold mb-1 text-green-600">
              +${((currentMonthRevenue?.amount || 0) - totalMonthlySpent).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">This month</div>
            <div className="text-xs text-green-600 mt-2">💚 Positive cash flow</div>
          </Card>
        </div>

        {/* Category Budgets */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Category Budgets</h2>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>

          <div className="space-y-4">
            {budgets.map(budget => {
              const spent = categorySpending[budget.category] || 0;
              const percentUsed = (spent / budget.monthly_limit) * 100;
              const status =
                percentUsed >= 100
                  ? 'danger'
                  : percentUsed >= budget.alert_threshold
                  ? 'warning'
                  : 'success';

              return (
                <div key={budget.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium capitalize">{budget.category}</div>
                      <div className="text-sm text-gray-600">
                        ${spent.toLocaleString()} / ${budget.monthly_limit.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress
                        value={percentUsed}
                        className={`flex-1 h-2 ${
                          status === 'danger'
                            ? 'bg-red-100'
                            : status === 'warning'
                            ? 'bg-amber-100'
                            : 'bg-green-100'
                        }`}
                      />
                      <Badge
                        variant={
                          status === 'danger'
                            ? 'destructive'
                            : status === 'warning'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {percentUsed.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Revenue Tracking */}
        <Card className="p-6">
          <Tabs defaultValue="monthly">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Revenue Tracking</h2>
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="chart">Chart</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="monthly" className="mt-4">
              <div className="space-y-3">
                {revenue.slice(0, 6).map(rev => (
                  <div
                    key={rev.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {new Date(2026, rev.month - 1).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">{rev.source}</div>
                    </div>
                    <div className="text-xl font-bold">${rev.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="chart">
              <div className="h-64 flex items-center justify-center text-gray-400">
                Revenue chart visualization
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </AppLayout>
  );
}
