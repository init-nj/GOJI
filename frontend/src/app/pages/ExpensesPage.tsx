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
import { Textarea } from '../components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Camera,
  Plus,
  Upload,
  Loader2,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Download,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { getStorageData, setStorageData, STORAGE_KEYS } from '../../lib/mockData';
import { extractReceiptData, categorizeExpense, detectAnomaly } from '../../lib/aiService';
import type { Expense, OCRData } from '../../lib/types';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // OCR State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrData, setOcrData] = useState<OCRData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    category: '',
    vendor_name: '',
    payment_method: '',
    expense_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = () => {
    const data = getStorageData<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    setExpenses(data);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) {
        toast.error('Only JPG, PNG, and PDF files are supported');
        return;
      }

      setSelectedFile(file);
      setShowOCRModal(true);
    }
  };

  const handleOCRProcess = async () => {
    if (!selectedFile) return;

    setOcrProcessing(true);

    try {
      const result = await extractReceiptData(selectedFile);

      if (result.success && result.extracted_data) {
        setOcrData(result.extracted_data);
        setPreviewUrl(result.image_url || '');

        // Auto-categorize
        const category = categorizeExpense(
          result.extracted_data.vendor,
          '',
          result.extracted_data.amount
        );

        // Pre-fill form with OCR data
        setFormData({
          title: `${result.extracted_data.vendor} - ${new Date(result.extracted_data.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
          description: result.extracted_data.items?.map(i => i.description).join(', ') || '',
          amount: String(result.extracted_data.amount),
          category: category.category,
          vendor_name: result.extracted_data.vendor,
          payment_method: '',
          expense_date: result.extracted_data.date,
        });

        toast.success('Receipt scanned successfully!');
      } else {
        toast.error('Failed to extract receipt data');
      }
    } catch (error) {
      toast.error('An error occurred while processing the receipt');
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleSaveExpense = () => {
    if (!formData.title || !formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const allExpenses = getStorageData<Expense[]>(STORAGE_KEYS.EXPENSES, []);

    // If category is empty, AI will categorize
    let finalCategory = formData.category;
    let aiConfidence = undefined;

    if (!finalCategory) {
      const result = categorizeExpense(formData.title, formData.description, parseFloat(formData.amount));
      finalCategory = result.category;
      aiConfidence = result.confidence;
    }

    // Detect anomaly
    const isAnomaly = detectAnomaly(parseFloat(formData.amount), finalCategory, allExpenses);

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      amount: parseFloat(formData.amount),
      currency: 'USD',
      category: finalCategory,
      vendor_name: formData.vendor_name,
      payment_method: formData.payment_method,
      expense_date: formData.expense_date,
      receipt_url: previewUrl || undefined,
      status: 'pending',
      created_by: '1',
      is_anomaly: isAnomaly,
      ai_confidence: aiConfidence,
      ai_category_suggestion: aiConfidence ? finalCategory : undefined,
      ocr_data: ocrData || undefined,
      created_at: new Date().toISOString(),
    };

    allExpenses.unshift(newExpense);
    setStorageData(STORAGE_KEYS.EXPENSES, allExpenses);
    setExpenses(allExpenses);

    toast.success(
      aiConfidence
        ? `Expense created! AI categorized as ${finalCategory} (${Math.round(aiConfidence * 100)}% confident)`
        : 'Expense created successfully'
    );

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: '',
      category: '',
      vendor_name: '',
      payment_method: '',
      expense_date: new Date().toISOString().split('T')[0],
    });
    setSelectedFile(null);
    setOcrData(null);
    setPreviewUrl('');
    setShowAddModal(false);
    setShowOCRModal(false);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setStorageData(STORAGE_KEYS.EXPENSES, updated);
    setExpenses(updated);
    toast.success('Expense deleted');
  };

  const handleApproveExpense = (id: string) => {
    const updated = expenses.map(e =>
      e.id === id ? { ...e, status: 'approved' as const } : e
    );
    setStorageData(STORAGE_KEYS.EXPENSES, updated);
    setExpenses(updated);
    toast.success('Expense approved');
  };

  const handleRejectExpense = (id: string) => {
    const updated = expenses.map(e =>
      e.id === id ? { ...e, status: 'rejected' as const } : e
    );
    setStorageData(STORAGE_KEYS.EXPENSES, updated);
    setExpenses(updated);
    toast.success('Expense rejected');
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(exp => {
    if (filterCategory !== 'all' && exp.category !== filterCategory) return false;
    if (filterStatus !== 'all' && exp.status !== filterStatus) return false;
    return true;
  });

  const categories = Array.from(new Set(expenses.map(e => e.category)));

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;

    const percent = Math.round(confidence * 100);
    if (percent >= 90) {
      return <Badge variant="outline" className="text-green-600 border-green-300">High {percent}%</Badge>;
    } else if (percent >= 70) {
      return <Badge variant="outline" className="text-amber-600 border-amber-300">Medium {percent}%</Badge>;
    } else {
      return <Badge variant="outline" className="text-red-600 border-red-300">Low {percent}%</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Expenses</h1>
            <p className="text-gray-600">Track and manage all your expenses</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
            <Button className="bg-[#FF6B6B] hover:bg-[#FF5252]">
              <label className="flex items-center cursor-pointer">
                <Camera className="w-4 h-4 mr-2" />
                Upload Receipt
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="filter-category">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger id="filter-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label htmlFor="filter-status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Expenses Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    No expenses found. Upload a receipt or add manually to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map(expense => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{expense.title}</div>
                        {expense.receipt_url && (
                          <span className="text-xs text-gray-500">📎 Receipt</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{expense.vendor_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">
                          {expense.category.replace('_', ' ')}
                        </Badge>
                        {expense.ai_category_suggestion && (
                          <Sparkles className="w-3 h-3 text-amber-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      ${expense.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {expense.status === 'approved' && (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          Approved
                        </Badge>
                      )}
                      {expense.status === 'pending' && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Pending
                        </Badge>
                      )}
                      {expense.status === 'rejected' && (
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          Rejected
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {expense.is_anomaly && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            🔍
                          </Badge>
                        )}
                        {expense.ai_confidence && expense.ai_confidence < 0.7 && (
                          <Badge variant="outline" className="text-gray-600 border-gray-300">
                            ⚠️
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setShowViewModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {expense.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveExpense(expense.id)}
                            >
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRejectExpense(expense.id)}
                            >
                              <XCircle className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
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

        {/* OCR Upload Modal */}
        <Dialog open={showOCRModal} onOpenChange={setShowOCRModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {ocrProcessing ? 'Processing Receipt...' : ocrData ? 'Review Extracted Data' : 'Upload Receipt'}
              </DialogTitle>
            </DialogHeader>

            {!ocrData ? (
              <div className="space-y-4">
                {selectedFile && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Selected file:</p>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleOCRProcess}
                    disabled={!selectedFile || ocrProcessing}
                    className="bg-[#FF6B6B] hover:bg-[#FF5252]"
                  >
                    {ocrProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Process with OCR
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Show preview */}
                {previewUrl && (
                  <div className="max-h-48 overflow-hidden rounded-lg border">
                    <img src={previewUrl} alt="Receipt" className="w-full object-contain" />
                  </div>
                )}

                {/* Confidence indicator */}
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700">
                      Overall Confidence: {Math.round(ocrData.confidence.overall * 100)}%
                    </span>
                    {getConfidenceBadge(ocrData.confidence.overall)}
                  </div>
                </div>

                {/* Form with extracted data */}
                <div className="space-y-3">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="flex items-center gap-2">
                        Amount
                        {getConfidenceBadge(ocrData.confidence.amount)}
                      </Label>
                      <Input
                        type="number"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label className="flex items-center gap-2">
                        Date
                        {getConfidenceBadge(ocrData.confidence.date)}
                      </Label>
                      <Input
                        type="date"
                        value={formData.expense_date}
                        onChange={e =>
                          setFormData({ ...formData, expense_date: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      Vendor
                      {getConfidenceBadge(ocrData.confidence.vendor)}
                    </Label>
                    <Input
                      value={formData.vendor_name}
                      onChange={e =>
                        setFormData({ ...formData, vendor_name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      Category
                      <Badge variant="outline" className="text-amber-500">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Suggested
                      </Badge>
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={v => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="software">Software</SelectItem>
                        <SelectItem value="rent">Rent</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="office_supplies">Office Supplies</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={e =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Payment Method</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={v => setFormData({ ...formData, payment_method: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveExpense} className="bg-[#FF6B6B] hover:bg-[#FF5252]">
                    Save Expense
                  </Button>
                  <Button variant="outline" onClick={() => setOcrData(null)}>
                    Re-scan
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Manual Add Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense Manually</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="AWS Services - Feb 2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="100"
                  />
                </div>

                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.expense_date}
                    onChange={e => setFormData({ ...formData, expense_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Vendor Name</Label>
                <Input
                  value={formData.vendor_name}
                  onChange={e => setFormData({ ...formData, vendor_name: e.target.value })}
                  placeholder="Amazon Web Services"
                />
              </div>

              <div>
                <Label>
                  Category (leave empty for AI categorization)
                  <Sparkles className="w-3 h-3 ml-1 inline text-amber-500" />
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={v => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto-categorize with AI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto-categorize with AI</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="office_supplies">Office Supplies</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Payment for cloud services"
                  rows={2}
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={v => setFormData({ ...formData, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveExpense} className="bg-[#FF6B6B] hover:bg-[#FF5252]">
                Save Expense
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Expense Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Expense Details</DialogTitle>
            </DialogHeader>

            {selectedExpense && (
              <div className="space-y-4">
                {selectedExpense.receipt_url && (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={selectedExpense.receipt_url}
                      alt="Receipt"
                      className="w-full object-contain max-h-64"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Title:</span>
                    <p className="font-medium">{selectedExpense.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Amount:</span>
                      <p className="font-bold text-lg">${selectedExpense.amount.toLocaleString()}</p>
                    </div>

                    <div>
                      <span className="text-sm text-gray-600">Date:</span>
                      <p className="font-medium">
                        {new Date(selectedExpense.expense_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-gray-600">Vendor:</span>
                    <p className="font-medium">{selectedExpense.vendor_name || '-'}</p>
                  </div>

                  <div>
                    <span className="text-sm text-gray-600">Category:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge>{selectedExpense.category.replace('_', ' ')}</Badge>
                      {selectedExpense.ai_category_suggestion && (
                        <>
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span className="text-xs text-gray-500">
                            AI categorized ({Math.round((selectedExpense.ai_confidence || 0) * 100)}%)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-gray-600">Description:</span>
                    <p className="text-sm">{selectedExpense.description || '-'}</p>
                  </div>

                  {selectedExpense.is_anomaly && (
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Flagged as unusual by AI
                        </span>
                      </div>
                      <p className="text-xs text-amber-600 mt-1">
                        Amount is significantly higher than typical {selectedExpense.category} expenses.
                      </p>
                    </div>
                  )}

                  {selectedExpense.ocr_data && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-700 mb-1">OCR Confidence</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-blue-600">Amount:</span>
                          <span className="font-medium">
                            {Math.round(selectedExpense.ocr_data.confidence.amount * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Date:</span>
                          <span className="font-medium">
                            {Math.round(selectedExpense.ocr_data.confidence.date * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Vendor:</span>
                          <span className="font-medium">
                            {Math.round(selectedExpense.ocr_data.confidence.vendor * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
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
