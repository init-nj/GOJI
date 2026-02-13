import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Plus,
  DollarSign,
  Download,
  Eye,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getStorageData, setStorageData, STORAGE_KEYS } from '../../lib/mockData';
import type { Payroll, Employee } from '../../lib/types';

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    overtime_hours: 0,
    bonus: 0,
    allowances: 0,
    tax: 0,
    insurance: 0,
    provident_fund: 0,
    loan_repayment: 0,
    other_deductions: 0,
    paid_leaves: 0,
    unpaid_leaves: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPayrolls(getStorageData<Payroll[]>(STORAGE_KEYS.PAYROLL, []));
    setEmployees(getStorageData<Employee[]>(STORAGE_KEYS.EMPLOYEES, []));
  };

  useEffect(() => {
    if (formData.employee_id) {
      const emp = employees.find(e => e.id === formData.employee_id);
      setSelectedEmployee(emp || null);
    } else {
      setSelectedEmployee(null);
    }
  }, [formData.employee_id, employees]);

  const calculatePayroll = () => {
    if (!selectedEmployee) return null;

    const baseSalary = selectedEmployee.base_salary;
    const overtimePay = formData.overtime_hours * (baseSalary / 176) * 1.5;
    const grossSalary = baseSalary + overtimePay + formData.bonus + formData.allowances;

    const tax = formData.tax || grossSalary * 0.15;
    const insurance = formData.insurance || 150;
    const providentFund = formData.provident_fund || grossSalary * 0.08;
    const totalDeductions =
      tax + insurance + providentFund + formData.loan_repayment + formData.other_deductions;

    const leaveDeduction = (baseSalary / 22) * formData.unpaid_leaves;
    const netSalary = grossSalary - totalDeductions - leaveDeduction;

    return {
      base_salary: baseSalary,
      overtime_pay: overtimePay,
      gross_salary: grossSalary,
      tax,
      insurance,
      provident_fund: providentFund,
      total_deductions: totalDeductions,
      leave_deduction: leaveDeduction,
      net_salary: netSalary,
    };
  };

  const calculated = calculatePayroll();

  const handleSavePayroll = (status: 'draft' | 'processed') => {
    if (!selectedEmployee || !calculated) {
      toast.error('Please select an employee');
      return;
    }

    const newPayroll: Payroll = {
      id: `pay-${Date.now()}`,
      employee_id: selectedEmployee.id,
      month: formData.month,
      year: formData.year,
      base_salary: calculated.base_salary,
      overtime_hours: formData.overtime_hours,
      overtime_pay: calculated.overtime_pay,
      bonus: formData.bonus,
      allowances: formData.allowances,
      gross_salary: calculated.gross_salary,
      tax: calculated.tax,
      insurance: calculated.insurance,
      provident_fund: calculated.provident_fund,
      loan_repayment: formData.loan_repayment,
      other_deductions: formData.other_deductions,
      total_deductions: calculated.total_deductions,
      paid_leaves: formData.paid_leaves,
      unpaid_leaves: formData.unpaid_leaves,
      leave_deduction: calculated.leave_deduction,
      net_salary: calculated.net_salary,
      status,
      created_at: new Date().toISOString(),
      processed_at: status === 'processed' ? new Date().toISOString() : undefined,
    };

    const allPayrolls = [...payrolls, newPayroll];
    setStorageData(STORAGE_KEYS.PAYROLL, allPayrolls);
    setPayrolls(allPayrolls);

    toast.success(`Payroll ${status === 'draft' ? 'saved as draft' : 'processed successfully'}`);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      overtime_hours: 0,
      bonus: 0,
      allowances: 0,
      tax: 0,
      insurance: 0,
      provident_fund: 0,
      loan_repayment: 0,
      other_deductions: 0,
      paid_leaves: 0,
      unpaid_leaves: 0,
    });
    setSelectedEmployee(null);
    setShowAddModal(false);
  };

  const handleDeletePayroll = (id: string) => {
    const updated = payrolls.filter(p => p.id !== id);
    setStorageData(STORAGE_KEYS.PAYROLL, updated);
    setPayrolls(updated);
    toast.success('Payroll record deleted');
  };

  const handleMarkPaid = (id: string) => {
    const updated = payrolls.map(p =>
      p.id === id ? { ...p, status: 'paid' as const } : p
    );
    setStorageData(STORAGE_KEYS.PAYROLL, updated);
    setPayrolls(updated);
    toast.success('Marked as paid');
  };

  const totalMonthlyPayroll = payrolls
    .filter(p => p.month === new Date().getMonth() + 1 && p.year === new Date().getFullYear())
    .reduce((sum, p) => sum + p.net_salary, 0);

  const averageSalary =
    payrolls.length > 0
      ? payrolls.reduce((sum, p) => sum + p.net_salary, 0) / payrolls.length
      : 0;

  const totalDeductions = payrolls
    .filter(p => p.month === new Date().getMonth() + 1 && p.year === new Date().getFullYear())
    .reduce((sum, p) => sum + p.total_deductions, 0);

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.designation} - ${emp.employee_id}` : 'Unknown';
  };

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payroll</h1>
            <p className="text-gray-600">Manage employee salaries and deductions</p>
          </div>

          <Button className="bg-[#FF6B6B] hover:bg-[#FF5252]" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Payroll
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">This Month's Payroll</p>
                <p className="text-2xl font-bold">${totalMonthlyPayroll.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{payrolls.filter(p => p.month === new Date().getMonth() + 1).length} employees</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Salary</p>
                <p className="text-2xl font-bold">${averageSalary.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Deductions</p>
                <p className="text-2xl font-bold">${totalDeductions.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Payroll Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Gross Salary</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrolls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    No payroll records yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                payrolls.map(payroll => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-medium">{getEmployeeName(payroll.employee_id)}</TableCell>
                    <TableCell>
                      {months[payroll.month - 1]} {payroll.year}
                    </TableCell>
                    <TableCell>${payroll.gross_salary.toLocaleString()}</TableCell>
                    <TableCell className="text-red-600">
                      -${payroll.total_deductions.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-bold">${payroll.net_salary.toLocaleString()}</TableCell>
                    <TableCell>
                      {payroll.status === 'paid' && (
                        <Badge className="bg-green-100 text-green-700">Paid</Badge>
                      )}
                      {payroll.status === 'processed' && (
                        <Badge className="bg-blue-100 text-blue-700">Processed</Badge>
                      )}
                      {payroll.status === 'draft' && (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {payroll.status === 'processed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkPaid(payroll.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info('Salary slip download coming soon!')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayroll(payroll.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Create Payroll Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Payroll</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Step 1: Select Employee */}
              <div>
                <Label>Select Employee</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={v => setFormData({ ...formData, employee_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.is_active).map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.designation} - {emp.employee_id} (${emp.base_salary}/mo)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Month</Label>
                  <Select
                    value={String(formData.month)}
                    onValueChange={v => setFormData({ ...formData, month: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              {selectedEmployee && (
                <>
                  {/* Step 3: Earnings */}
                  <Card className="p-4 bg-green-50">
                    <h3 className="font-bold mb-3 text-green-800">Earnings</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Base Salary:</span>
                        <span className="font-bold">${selectedEmployee.base_salary.toLocaleString()}</span>
                      </div>

                      <div>
                        <Label>Overtime Hours</Label>
                        <Input
                          type="number"
                          value={formData.overtime_hours}
                          onChange={e =>
                            setFormData({ ...formData, overtime_hours: parseFloat(e.target.value) || 0 })
                          }
                        />
                        {formData.overtime_hours > 0 && calculated && (
                          <p className="text-xs text-gray-600 mt-1">
                            Overtime Pay: ${calculated.overtime_pay.toFixed(2)}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label>Bonus</Label>
                        <Input
                          type="number"
                          value={formData.bonus}
                          onChange={e => setFormData({ ...formData, bonus: parseFloat(e.target.value) || 0 })}
                        />
                      </div>

                      <div>
                        <Label>Allowances</Label>
                        <Input
                          type="number"
                          value={formData.allowances}
                          onChange={e =>
                            setFormData({ ...formData, allowances: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>

                      {calculated && (
                        <div className="flex justify-between pt-2 border-t border-green-200">
                          <span className="font-bold">Gross Salary:</span>
                          <span className="font-bold text-lg">
                            ${calculated.gross_salary.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Step 4: Deductions */}
                  <Card className="p-4 bg-red-50">
                    <h3 className="font-bold mb-3 text-red-800">Deductions</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Tax (auto: 15%)</Label>
                        <Input
                          type="number"
                          value={formData.tax}
                          onChange={e => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                          placeholder={calculated ? String(calculated.tax.toFixed(2)) : ''}
                        />
                      </div>

                      <div>
                        <Label>Insurance</Label>
                        <Input
                          type="number"
                          value={formData.insurance}
                          onChange={e =>
                            setFormData({ ...formData, insurance: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="150"
                        />
                      </div>

                      <div>
                        <Label>Provident Fund (auto: 8%)</Label>
                        <Input
                          type="number"
                          value={formData.provident_fund}
                          onChange={e =>
                            setFormData({ ...formData, provident_fund: parseFloat(e.target.value) || 0 })
                          }
                          placeholder={calculated ? String(calculated.provident_fund.toFixed(2)) : ''}
                        />
                      </div>

                      <div>
                        <Label>Loan Repayment</Label>
                        <Input
                          type="number"
                          value={formData.loan_repayment}
                          onChange={e =>
                            setFormData({ ...formData, loan_repayment: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>

                      <div>
                        <Label>Other Deductions</Label>
                        <Input
                          type="number"
                          value={formData.other_deductions}
                          onChange={e =>
                            setFormData({ ...formData, other_deductions: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>

                      {calculated && (
                        <div className="flex justify-between pt-2 border-t border-red-200">
                          <span className="font-bold">Total Deductions:</span>
                          <span className="font-bold text-lg text-red-700">
                            -${calculated.total_deductions.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Step 5: Leave Adjustments */}
                  <Card className="p-4">
                    <h3 className="font-bold mb-3">Leave Adjustments</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Paid Leaves Taken</Label>
                        <Input
                          type="number"
                          value={formData.paid_leaves}
                          onChange={e =>
                            setFormData({ ...formData, paid_leaves: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>

                      <div>
                        <Label>Unpaid Leaves Taken</Label>
                        <Input
                          type="number"
                          value={formData.unpaid_leaves}
                          onChange={e =>
                            setFormData({ ...formData, unpaid_leaves: parseFloat(e.target.value) || 0 })
                          }
                        />
                        {formData.unpaid_leaves > 0 && calculated && (
                          <p className="text-xs text-red-600 mt-1">
                            Deduction: ${calculated.leave_deduction.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Step 6: Summary */}
                  {calculated && (
                    <Card className="p-4 bg-blue-50">
                      <h3 className="font-bold mb-3 text-blue-800">Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Gross Salary:</span>
                          <span>${calculated.gross_salary.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Total Deductions:</span>
                          <span>-${calculated.total_deductions.toFixed(2)}</span>
                        </div>
                        {calculated.leave_deduction > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Leave Deduction:</span>
                            <span>-${calculated.leave_deduction.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-blue-200">
                          <span className="font-bold text-lg">Net Salary:</span>
                          <span className="font-bold text-2xl text-blue-700">
                            ${calculated.net_salary.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  )}
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleSavePayroll('draft')}
                  variant="outline"
                  disabled={!selectedEmployee}
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSavePayroll('processed')}
                  className="bg-[#FF6B6B] hover:bg-[#FF5252]"
                  disabled={!selectedEmployee}
                >
                  Process & Save
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
