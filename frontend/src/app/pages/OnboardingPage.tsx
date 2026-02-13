import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Wallet, ArrowDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { setStorageData, STORAGE_KEYS } from '../../lib/mockData';
import type { CompanySettings, Budget, Revenue, Employee } from '../../lib/types';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Step 2: Organization Details
  const [orgData, setOrgData] = useState({
    company_name: '',
    industry: '',
    num_employees: '',
    currency: 'USD',
    financial_year_start: '1',
  });

  // Step 3: Budget & Revenue
  const [budgetData, setBudgetData] = useState({
    monthly_revenue: '',
    total_budget: '',
    monthly_budget_limit: '',
    categories: {
      marketing: { limit: '', threshold: 80 },
      software: { limit: '', threshold: 80 },
      rent: { limit: '', threshold: 80 },
      utilities: { limit: '', threshold: 80 },
      payroll: { limit: '', threshold: 80 },
    },
  });

  // Step 4: Add First Employee
  const [employeeData, setEmployeeData] = useState({
    full_name: user?.first_name + ' ' + user?.last_name || '',
    email: user?.email || '',
    designation: '',
    department: '',
    monthly_salary: '',
  });

  const [showCategoryBudgets, setShowCategoryBudgets] = useState(false);

  const progressPercent = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step === 2 && !validateOrgData()) return;
    if (step === 3 && !validateBudgetData()) return;

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const validateOrgData = (): boolean => {
    if (!orgData.company_name.trim()) {
      toast.error('Company name is required');
      return false;
    }
    return true;
  };

  const validateBudgetData = (): boolean => {
    if (!budgetData.total_budget || parseFloat(budgetData.total_budget) <= 0) {
      toast.error('Total budget is required');
      return false;
    }
    return true;
  };

  const handleComplete = () => {
    // Save company settings
    const settings: CompanySettings = {
      id: '1',
      company_name: orgData.company_name,
      currency: orgData.currency,
      financial_year_start: parseInt(orgData.financial_year_start),
      default_working_days: 22,
      total_budget: parseFloat(budgetData.total_budget) || 200000,
      monthly_budget_limit: parseFloat(budgetData.monthly_budget_limit) ||
        parseFloat(budgetData.total_budget) / 12 || 20000,
    };
    setStorageData(STORAGE_KEYS.COMPANY_SETTINGS, settings);

    // Save revenue if provided
    if (budgetData.monthly_revenue && parseFloat(budgetData.monthly_revenue) > 0) {
      const revenue: Revenue[] = [
        {
          id: '1',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          amount: parseFloat(budgetData.monthly_revenue),
          source: 'operations',
          notes: 'Initial setup',
          created_at: new Date().toISOString(),
        },
      ];
      setStorageData(STORAGE_KEYS.REVENUE, revenue);
    }

    // Save category budgets
    const budgets: Budget[] = [];
    Object.entries(budgetData.categories).forEach(([category, data], index) => {
      if (data.limit && parseFloat(data.limit) > 0) {
        budgets.push({
          id: String(index + 1),
          category,
          monthly_limit: parseFloat(data.limit),
          yearly_limit: parseFloat(data.limit) * 12,
          year: new Date().getFullYear(),
          alert_threshold: data.threshold,
          is_active: true,
        });
      }
    });

    if (budgets.length > 0) {
      setStorageData(STORAGE_KEYS.BUDGETS, budgets);
    }

    // Save employee if provided
    if (employeeData.full_name && employeeData.monthly_salary) {
      const [firstName, ...lastNameParts] = employeeData.full_name.split(' ');
      const lastName = lastNameParts.join(' ');

      const employee: Employee = {
        id: '1',
        user_id: user?.id || '1',
        employee_id: 'EMP001',
        designation: employeeData.designation || 'Employee',
        department: employeeData.department || 'General',
        base_salary: parseFloat(employeeData.monthly_salary),
        currency: orgData.currency,
        date_of_joining: new Date().toISOString().split('T')[0],
        employment_type: 'full_time',
        is_active: true,
      };

      const existingEmployees = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]'
      );
      existingEmployees.push(employee);
      setStorageData(STORAGE_KEYS.EMPLOYEES, existingEmployees);
    }

    toast.success('Setup complete! Welcome to GOJI 🎉');
    completeOnboarding();
    setTimeout(() => {
      navigate('/dashboard');
    }, 500);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold mb-4">Welcome to Goji, {user?.first_name}!</h2>
            <p className="text-lg text-gray-600 mb-8">
              Let's set up your organization in 3 minutes
            </p>
            <Button
              size="lg"
              className="bg-[#FF6B6B] hover:bg-[#FF5252]"
              onClick={handleNext}
            >
              Get Started
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Organization Details</h2>
              <p className="text-gray-600">Tell us about your company</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="company_name">
                  Company/Organization Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="company_name"
                  placeholder="Acme Startup"
                  value={orgData.company_name}
                  onChange={e => setOrgData({ ...orgData, company_name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={orgData.industry} onValueChange={v => setOrgData({ ...orgData, industry: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="num_employees">Number of Employees</Label>
                <Input
                  id="num_employees"
                  type="number"
                  placeholder="10"
                  value={orgData.num_employees}
                  onChange={e => setOrgData({ ...orgData, num_employees: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={orgData.currency} onValueChange={v => setOrgData({ ...orgData, currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="financial_year_start">Financial Year Start Month</Label>
                <Select
                  value={orgData.financial_year_start}
                  onValueChange={v => setOrgData({ ...orgData, financial_year_start: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button className="bg-[#FF6B6B] hover:bg-[#FF5252]" onClick={handleNext}>
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 3:
        const suggestedMonthly = budgetData.total_budget
          ? (parseFloat(budgetData.total_budget) / 12).toFixed(0)
          : '';

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Set Your Budget</h2>
              <p className="text-gray-600">Track spending against your available funds</p>
            </div>

            <div className="space-y-4">
              {/* Monthly Revenue */}
              <div>
                <Label htmlFor="monthly_revenue" className="flex items-center gap-2">
                  <ArrowDown className="w-4 h-4 text-green-600" />
                  Monthly Revenue/Income (optional)
                </Label>
                <Input
                  id="monthly_revenue"
                  type="number"
                  placeholder="25000"
                  value={budgetData.monthly_revenue}
                  onChange={e =>
                    setBudgetData({ ...budgetData, monthly_revenue: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">Your company's monthly income</p>
              </div>

              {/* Total Budget */}
              <div>
                <Label htmlFor="total_budget" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#FF6B6B]" />
                  Total Available Budget <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="total_budget"
                  type="number"
                  placeholder="200000"
                  value={budgetData.total_budget}
                  onChange={e => setBudgetData({ ...budgetData, total_budget: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Total funds available (funding, savings, etc.)
                </p>
              </div>

              {/* Monthly Budget Limit */}
              <div>
                <Label htmlFor="monthly_budget_limit">Monthly Spending Limit (optional)</Label>
                <Input
                  id="monthly_budget_limit"
                  type="number"
                  placeholder={suggestedMonthly}
                  value={budgetData.monthly_budget_limit}
                  onChange={e =>
                    setBudgetData({ ...budgetData, monthly_budget_limit: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  {suggestedMonthly && `Suggested: $${suggestedMonthly} (Total ÷ 12)`}
                </p>
              </div>

              {/* Category Budgets */}
              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCategoryBudgets(!showCategoryBudgets)}
                  className="w-full"
                >
                  {showCategoryBudgets ? 'Hide' : 'Set'} Category Budgets (Optional)
                </Button>

                {showCategoryBudgets && (
                  <div className="mt-4 space-y-4">
                    {Object.entries(budgetData.categories).map(([category, data]) => (
                      <Card key={category} className="p-4">
                        <Label className="capitalize mb-2 block">{category}</Label>
                        <div className="space-y-3">
                          <div>
                            <Input
                              type="number"
                              placeholder="Monthly limit"
                              value={data.limit}
                              onChange={e =>
                                setBudgetData({
                                  ...budgetData,
                                  categories: {
                                    ...budgetData.categories,
                                    [category]: { ...data, limit: e.target.value },
                                  },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">
                              Alert at {data.threshold}% of budget
                            </Label>
                            <Slider
                              value={[data.threshold]}
                              onValueChange={v =>
                                setBudgetData({
                                  ...budgetData,
                                  categories: {
                                    ...budgetData.categories,
                                    [category]: { ...data, threshold: v[0] },
                                  },
                                })
                              }
                              min={0}
                              max={100}
                              step={5}
                              className="mt-2"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button className="bg-[#FF6B6B] hover:bg-[#FF5252]" onClick={handleNext}>
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Add Your First Employee</h2>
              <p className="text-gray-600">Start with yourself or a team member (optional)</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="John Doe"
                  value={employeeData.full_name}
                  onChange={e => setEmployeeData({ ...employeeData, full_name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={employeeData.email}
                  onChange={e => setEmployeeData({ ...employeeData, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  placeholder="CEO"
                  value={employeeData.designation}
                  onChange={e =>
                    setEmployeeData({ ...employeeData, designation: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="Executive"
                  value={employeeData.department}
                  onChange={e => setEmployeeData({ ...employeeData, department: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="monthly_salary">Monthly Salary</Label>
                <Input
                  id="monthly_salary"
                  type="number"
                  placeholder="5000"
                  value={employeeData.monthly_salary}
                  onChange={e =>
                    setEmployeeData({ ...employeeData, monthly_salary: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleNext}>
                  Skip
                </Button>
                <Button className="bg-[#FF6B6B] hover:bg-[#FF5252]" onClick={handleNext}>
                  Add Employee
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-green-600" />
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-2">You're all set! 🎉</h2>
              <p className="text-lg text-gray-600">Your dashboard is ready</p>
            </div>

            <Card className="max-w-md mx-auto p-6">
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-600">Budget:</span>
                  <span className="font-bold">
                    ${parseFloat(budgetData.total_budget || '200000').toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Limit:</span>
                  <span className="font-bold">
                    $
                    {(
                      parseFloat(budgetData.monthly_budget_limit) ||
                      parseFloat(budgetData.total_budget) / 12 ||
                      20000
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Company:</span>
                  <span className="font-bold">{orgData.company_name}</span>
                </div>
                {employeeData.full_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">First Employee:</span>
                    <span className="font-bold">{employeeData.full_name}</span>
                  </div>
                )}
              </div>
            </Card>

            <Button
              size="lg"
              className="bg-[#FF6B6B] hover:bg-[#FF5252]"
              onClick={handleComplete}
            >
              Go to Dashboard
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Step Content */}
        {renderStep()}
      </Card>
    </div>
  );
}
