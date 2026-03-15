import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSearchParams } from 'react-router-dom';
import { Transaction, Category } from '../types';
import { Plus, Search, Filter, Trash2, Calendar, IndianRupee, Tag, FileText, ChevronDown, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function Transactions() {
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(searchParams.get('add') === 'true');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'adjustment'>('all');

  // Form State
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'adjustment'>('expense');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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
      if (defaultCat) setCategoryId(defaultCat.id.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (newType: 'income' | 'expense' | 'adjustment') => {
    setType(newType);
    // Auto-select first category of that type
    const firstCatOfType = categories.find(c => c.type === newType);
    if (firstCatOfType) {
      setCategoryId(firstCatOfType.id.toString());
    } else {
      setCategoryId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      alert('Please select a category');
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
      loadData();
    } catch (err: any) {
      console.error('Submit error:', err);
      alert(err.message || 'Failed to add transaction');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      await api.transactions.delete(id);
      loadData();
    }
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
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-brand-accent text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-accent-hover transition-all shadow-xl shadow-brand-accent/20"
        >
          {showAddForm ? <ChevronDown className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showAddForm ? 'Close Form' : 'Add Transaction'}
        </button>
      </header>

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
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {(['all', 'income', 'expense', 'adjustment'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-5 py-3 rounded-2xl font-bold capitalize transition-all whitespace-nowrap ${
                filterType === type 
                  ? 'bg-brand-primary text-white shadow-md' 
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
        <div className="overflow-x-auto">
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
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">Loading transactions...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No transactions found.</td></tr>
              ) : (
                filteredTransactions.map((t) => (
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
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${t.type === 'income' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                      {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
