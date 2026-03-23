import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSearchParams } from 'react-router-dom';
import { Transaction, Category } from '../types';
import { Plus, Search, Filter, Trash2, Calendar, IndianRupee, Tag, FileText, ChevronDown, RefreshCw, Edit2, X, AlertCircle, CheckCircle2, Download, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

import LoadingSpinner from '../components/LoadingSpinner';

interface EditModalProps {
  transaction: Transaction;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}

function EditTransactionModal({ transaction, categories, onClose, onSave }: EditModalProps) {
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '0');
  const [categoryId, setCategoryId] = useState(transaction?.category_id?.toString() || '');
  const [type, setType] = useState<'income' | 'expense' | 'adjustment'>(transaction?.type || 'expense');
  const [description, setDescription] = useState(transaction?.description || '');
  const [date, setDate] = useState(transaction?.date ? format(new Date(transaction.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.transactions.update(transaction.id, {
        amount: parseFloat(amount),
        category_id: parseInt(categoryId),
        type,
        description,
        date
      });
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-black/5 flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit Transaction</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <IndianRupee className="w-4 h-4" /> Amount
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Type</label>
            <div className="flex bg-zinc-100 p-1 rounded-xl gap-1">
              {(['expense', 'income', 'adjustment'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === t ? 'bg-white text-black shadow-sm' : 'text-zinc-500'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Category
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black outline-none transition-all appearance-none bg-white"
            >
              {categories.filter(c => c.type === type).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black outline-none transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-bold border border-zinc-200 hover:bg-zinc-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function Transactions() {
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(searchParams.get('add') === 'true');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'adjustment'>('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'adjustment'>('expense');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([
        api.transactions.getAll(),
        api.categories.getAll()
      ]);
      setTransactions(t);
      setCategories(c);
      
      // Set initial category based on default type (expense)
      const defaultCat = c.find(cat => cat.type === 'expense');
      if (defaultCat) setCategoryId(defaultCat.id?.toString() || '');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (newType: 'income' | 'expense' | 'adjustment') => {
    setType(newType);
    // Auto-select first category of that type
    const firstCatOfType = categories.find(c => c.type === newType);
    if (firstCatOfType) {
      setCategoryId(firstCatOfType.id?.toString() || '');
    } else {
      setCategoryId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!categoryId) {
      setError('Please select a category');
      return;
    }
    try {
      await api.transactions.create({
        category_id: parseInt(categoryId),
        amount: parseFloat(amount),
        type,
        description,
        date
      });
      setShowAddForm(false);
      setAmount('');
      setDescription('');
      setSuccess('Transaction saved successfully');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to add transaction');
    }
  };

  const handleDelete = async (id: number | string) => {
    setError(null);
    try {
      await api.transactions.delete(id);
      setDeleteConfirmId(null);
      setSuccess('Transaction deleted successfully');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete transaction');
      setDeleteConfirmId(null);
    }
  };

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      setError('No transactions to export');
      return;
    }
    const data = filteredTransactions.map(t => ({
      Date: format(new Date(t.date), 'yyyy-MM-dd'),
      Category: t.category_name,
      Type: t.type,
      Description: t.description || '',
      Amount: t.amount
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, `Transactions_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    setSuccess('Excel file downloaded successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleCopyTransactions = () => {
    if (filteredTransactions.length === 0) {
      setError('No transactions to copy');
      return;
    }

    const data = filteredTransactions.map(t => ({
      date: format(new Date(t.date), 'yyyy-MM-dd'),
      category: t.category_name || 'Uncategorized',
      type: t.type,
      description: t.description || '-',
      amount: `₹${t.amount.toLocaleString('en-IN')}`
    }));

    const headers = ['Date', 'Category', 'Type', 'Description', 'Amount'];
    const colWidths = {
      date: Math.max(headers[0].length, ...data.map(d => d.date.length)),
      category: Math.max(headers[1].length, ...data.map(d => d.category.length)),
      type: Math.max(headers[2].length, ...data.map(d => d.type.length)),
      description: Math.max(headers[3].length, ...data.map(d => d.description.length)),
      amount: Math.max(headers[4].length, ...data.map(d => d.amount.length))
    };

    const pad = (str: string, width: number) => str.padEnd(width);
    const border = `+${'-'.repeat(colWidths.date + 2)}+${'-'.repeat(colWidths.category + 2)}+${'-'.repeat(colWidths.type + 2)}+${'-'.repeat(colWidths.description + 2)}+${'-'.repeat(colWidths.amount + 2)}+`;
    const headerRow = `| ${pad(headers[0], colWidths.date)} | ${pad(headers[1], colWidths.category)} | ${pad(headers[2], colWidths.type)} | ${pad(headers[3], colWidths.description)} | ${pad(headers[4], colWidths.amount)} |`;
    
    const rows = data.map(d => 
      `| ${pad(d.date, colWidths.date)} | ${pad(d.category, colWidths.category)} | ${pad(d.type, colWidths.type)} | ${pad(d.description, colWidths.description)} | ${pad(d.amount, colWidths.amount)} |`
    ).join('\n' + border + '\n');

    const table = `${border}\n${headerRow}\n${border}\n${rows}\n${border}`;
    
    navigator.clipboard.writeText(table);
    setSuccess('Transactions table copied to clipboard');
    setTimeout(() => setSuccess(null), 3000);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Transactions</h1>
          <p className="text-zinc-500">Manage your income and expenses here.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleCopyTransactions}
            className="flex items-center gap-2 bg-white text-zinc-600 px-4 py-3 rounded-2xl font-bold hover:bg-zinc-50 border border-black/5 transition-all shadow-sm"
            title="Copy to Clipboard"
          >
            <Copy className="w-5 h-5" />
            <span className="hidden sm:inline">Copy</span>
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-white text-zinc-600 px-4 py-3 rounded-2xl font-bold hover:bg-zinc-50 border border-black/5 transition-all shadow-sm"
            title="Export to Excel"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-brand-accent text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-accent-hover transition-all shadow-xl shadow-brand-accent/20"
          >
            {showAddForm ? <ChevronDown className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showAddForm ? 'Close Form' : 'Add Transaction'}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto p-1 hover:bg-emerald-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4" /> Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Category
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all appearance-none bg-white"
                >
                  <option value="" disabled>Select a category</option>
                  {categories.filter(c => c.type === type).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                  placeholder="What was this for?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Type</label>
                <div className="flex bg-zinc-100 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-zinc-500'}`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500'}`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('adjustment')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'adjustment' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500'}`}
                  >
                    Adjustment
                  </button>
                </div>
              </div>

              <div className="md:col-span-full flex justify-end">
                <button
                  type="submit"
                  className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/10"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-black/5 focus:border-black outline-none transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'income', 'expense', 'adjustment'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-2xl font-bold capitalize transition-all text-sm sm:text-base ${
                filterType === type 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                  : 'bg-white text-zinc-500 hover:bg-zinc-50 border border-black/5'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading transactions..." />
        ) : filteredTransactions.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-500">No transactions found.</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-600">
                        {format(new Date(t.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold uppercase" style={{ backgroundColor: t.category_color }}>
                            {t.category_name?.substring(0, 2)}
                          </div>
                          <span className="text-sm font-bold text-zinc-900">{t.category_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 max-w-xs truncate">
                        {t.description || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${t.type === 'income' || t.type === 'adjustment' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                        {t.type === 'income' || t.type === 'adjustment' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {deleteConfirmId === t.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="p-2 text-red-600 bg-red-50 rounded-xl transition-all font-bold text-xs"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-xl transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => setEditingTransaction(t)}
                                className="p-2 text-zinc-400 hover:text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(t.id)}
                                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden divide-y divide-black/5">
              {filteredTransactions.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold uppercase shrink-0" style={{ backgroundColor: t.category_color }}>
                      {t.category_name?.substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 truncate">{t.category_name}</span>
                        <span className="text-[10px] text-zinc-400 whitespace-nowrap">{format(new Date(t.date), 'MMM d')}</span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{t.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold ${t.type === 'income' || t.type === 'adjustment' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                      {t.type === 'income' || t.type === 'adjustment' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                    </span>
                    <div className="flex items-center gap-1">
                      {deleteConfirmId === t.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-2 text-red-600 bg-red-50 rounded-xl transition-all font-bold text-xs"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-xl transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => setEditingTransaction(t)}
                            className="p-2 text-zinc-400 hover:text-brand-primary active:bg-brand-primary/5 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(t.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 active:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          categories={categories}
          onClose={() => setEditingTransaction(null)}
          onSave={loadData}
        />
      )}
    </div>
  );
}
