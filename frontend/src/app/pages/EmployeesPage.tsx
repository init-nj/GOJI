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
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Plus, Edit, Eye, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getStorageData, setStorageData, STORAGE_KEYS } from '../../lib/mockData';
import type { Employee } from '../../lib/types';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    designation: '',
    department: '',
    base_salary: '',
    currency: 'USD',
    date_of_joining: new Date().toISOString().split('T')[0],
    employment_type: 'full_time' as 'full_time' | 'part_time' | 'contract',
    bank_name: '',
    account_number: '',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    setEmployees(getStorageData<Employee[]>(STORAGE_KEYS.EMPLOYEES, []));
  };

  const handleSaveEmployee = () => {
    if (!formData.employee_id || !formData.designation || !formData.base_salary) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      user_id: '1',
      employee_id: formData.employee_id,
      designation: formData.designation,
      department: formData.department || 'General',
      base_salary: parseFloat(formData.base_salary),
      currency: formData.currency,
      date_of_joining: formData.date_of_joining,
      employment_type: formData.employment_type,
      is_active: true,
      bank_name: formData.bank_name || undefined,
      account_number: formData.account_number || undefined,
    };

    const allEmployees = [...employees, newEmployee];
    setStorageData(STORAGE_KEYS.EMPLOYEES, allEmployees);
    setEmployees(allEmployees);

    toast.success('Employee added successfully');
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      designation: '',
      department: '',
      base_salary: '',
      currency: 'USD',
      date_of_joining: new Date().toISOString().split('T')[0],
      employment_type: 'full_time',
      bank_name: '',
      account_number: '',
    });
    setShowAddModal(false);
  };

  const handleDeleteEmployee = (id: string) => {
    const updated = employees.filter(e => e.id !== id);
    setStorageData(STORAGE_KEYS.EMPLOYEES, updated);
    setEmployees(updated);
    toast.success('Employee deleted');
  };

  const activeEmployees = employees.filter(e => e.is_active).length;
  const totalSalaryBudget = employees
    .filter(e => e.is_active)
    .reduce((sum, e) => sum + e.base_salary, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Employees</h1>
            <p className="text-gray-600">Manage your team members</p>
          </div>

          <Button className="bg-[#FF6B6B] hover:bg-[#FF5252]" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Employees</p>
                <p className="text-2xl font-bold">{activeEmployees}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Salary Budget</p>
                <p className="text-2xl font-bold">${totalSalaryBudget.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Salary</p>
                <p className="text-2xl font-bold">
                  ${activeEmployees > 0 ? (totalSalaryBudget / activeEmployees).toFixed(0) : '0'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Employees Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Joining Date</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    No employees yet. Add your first employee to get started.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map(employee => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-[#FF6B6B] text-white text-xs">
                            {employee.designation.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{employee.designation}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{employee.employee_id}</TableCell>
                    <TableCell>{employee.designation}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>
                      {new Date(employee.date_of_joining).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-bold">
                      ${employee.base_salary.toLocaleString()}/mo
                    </TableCell>
                    <TableCell>
                      {employee.is_active ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowViewModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEmployee(employee.id)}
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

        {/* Add Employee Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Employee ID <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.employee_id}
                  onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                  placeholder="EMP001"
                />
              </div>

              <div>
                <Label>Designation <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.designation}
                  onChange={e => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="Software Engineer"
                />
              </div>

              <div>
                <Label>Department</Label>
                <Input
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Engineering"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Base Salary <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={formData.base_salary}
                    onChange={e => setFormData({ ...formData, base_salary: e.target.value })}
                    placeholder="5000"
                  />
                </div>

                <div>
                  <Label>Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={v => setFormData({ ...formData, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Date of Joining</Label>
                <Input
                  type="date"
                  value={formData.date_of_joining}
                  onChange={e => setFormData({ ...formData, date_of_joining: e.target.value })}
                />
              </div>

              <div>
                <Label>Employment Type</Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={v =>
                    setFormData({ ...formData, employment_type: v as typeof formData.employment_type })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Bank Name (optional)</Label>
                <Input
                  value={formData.bank_name}
                  onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="Chase Bank"
                />
              </div>

              <div>
                <Label>Account Number (optional)</Label>
                <Input
                  value={formData.account_number}
                  onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="****1234"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveEmployee} className="bg-[#FF6B6B] hover:bg-[#FF5252]">
                Add Employee
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Employee Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Employee Details</DialogTitle>
            </DialogHeader>

            {selectedEmployee && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-[#FF6B6B] text-white text-lg">
                      {selectedEmployee.designation.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-lg">{selectedEmployee.designation}</h3>
                    <p className="text-sm text-gray-600">{selectedEmployee.employee_id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-medium">{selectedEmployee.department}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Employment Type</p>
                    <p className="font-medium capitalize">
                      {selectedEmployee.employment_type.replace('_', ' ')}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Base Salary</p>
                    <p className="font-bold text-lg">
                      ${selectedEmployee.base_salary.toLocaleString()}/mo
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Date of Joining</p>
                    <p className="font-medium">
                      {new Date(selectedEmployee.date_of_joining).toLocaleDateString()}
                    </p>
                  </div>

                  {selectedEmployee.bank_name && (
                    <div>
                      <p className="text-sm text-gray-600">Bank Name</p>
                      <p className="font-medium">{selectedEmployee.bank_name}</p>
                    </div>
                  )}

                  {selectedEmployee.account_number && (
                    <div>
                      <p className="text-sm text-gray-600">Account Number</p>
                      <p className="font-medium font-mono">{selectedEmployee.account_number}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button variant="outline" onClick={() => setShowViewModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
