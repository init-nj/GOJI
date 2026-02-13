import AppLayout from '../components/AppLayout';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Receipt, DollarSign, BarChart3, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export default function ReportsPage() {
  const [expenseReport, setExpenseReport] = useState({
    type: 'monthly',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    format: 'pdf',
  });

  const [payrollReport, setPayrollReport] = useState({
    type: 'summary',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    format: 'pdf',
  });

  const [financialReport, setFinancialReport] = useState({
    type: 'cash_flow',
    months: 6,
    format: 'pdf',
  });

  const handleGenerateReport = (reportName: string) => {
    toast.success(`Generating ${reportName}...`);
    setTimeout(() => {
      toast.info('In a real app, this would download the report file');
    }, 1000);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-gray-600">Generate and download financial reports</p>
        </div>

        {/* Report Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Expense Reports */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Receipt className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Expense Reports</h3>
                <p className="text-sm text-gray-600">Generate expense summaries and breakdowns</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Report Type</Label>
                <Select
                  value={expenseReport.type}
                  onValueChange={v => setExpenseReport({ ...expenseReport, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly Summary</SelectItem>
                    <SelectItem value="category">Category Breakdown</SelectItem>
                    <SelectItem value="vendor">Vendor-wise Spending</SelectItem>
                    <SelectItem value="anomaly">Anomaly Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Month</Label>
                  <Select
                    value={String(expenseReport.month)}
                    onValueChange={v => setExpenseReport({ ...expenseReport, month: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={expenseReport.year}
                    onChange={e => setExpenseReport({ ...expenseReport, year: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Format</Label>
                <Select
                  value={expenseReport.format}
                  onValueChange={v => setExpenseReport({ ...expenseReport, format: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full bg-[#FF6B6B] hover:bg-[#FF5252]"
                onClick={() => handleGenerateReport('Expense Report')}
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </Card>

          {/* Payroll Reports */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Payroll Reports</h3>
                <p className="text-sm text-gray-600">Generate payroll summaries and slips</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Report Type</Label>
                <Select
                  value={payrollReport.type}
                  onValueChange={v => setPayrollReport({ ...payrollReport, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Monthly Summary</SelectItem>
                    <SelectItem value="department">Department-wise</SelectItem>
                    <SelectItem value="slips">All Salary Slips</SelectItem>
                    <SelectItem value="deductions">Deductions Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Month</Label>
                  <Select
                    value={String(payrollReport.month)}
                    onValueChange={v => setPayrollReport({ ...payrollReport, month: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={payrollReport.year}
                    onChange={e => setPayrollReport({ ...payrollReport, year: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Format</Label>
                <Select
                  value={payrollReport.format}
                  onValueChange={v => setPayrollReport({ ...payrollReport, format: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full bg-[#FF6B6B] hover:bg-[#FF5252]"
                onClick={() => handleGenerateReport('Payroll Report')}
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </Card>

          {/* Financial Reports */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Financial Reports</h3>
                <p className="text-sm text-gray-600">Comprehensive financial analysis</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Report Type</Label>
                <Select
                  value={financialReport.type}
                  onValueChange={v => setFinancialReport({ ...financialReport, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_flow">Cash Flow Report</SelectItem>
                    <SelectItem value="burn_rate">Burn Rate Analysis</SelectItem>
                    <SelectItem value="budget_vs_actual">Budget vs Actual</SelectItem>
                    <SelectItem value="health">Financial Health Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Time Period (Months)</Label>
                <Input
                  type="number"
                  value={financialReport.months}
                  onChange={e =>
                    setFinancialReport({ ...financialReport, months: parseInt(e.target.value) })
                  }
                />
              </div>

              <div>
                <Label>Format</Label>
                <Select
                  value={financialReport.format}
                  onValueChange={v => setFinancialReport({ ...financialReport, format: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full bg-[#FF6B6B] hover:bg-[#FF5252]"
                onClick={() => handleGenerateReport('Financial Report')}
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </Card>

          {/* Custom Reports */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Custom Reports</h3>
                <p className="text-sm text-gray-600">Build your own custom report</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Select data sources and metrics to create a custom report tailored to your needs.
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => toast.info('Custom report builder coming soon!')}
              >
                Build Custom Report
              </Button>
            </div>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Recent Reports</h3>
          <div className="text-center text-gray-500 py-8">
            No reports generated yet. Create your first report above.
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
