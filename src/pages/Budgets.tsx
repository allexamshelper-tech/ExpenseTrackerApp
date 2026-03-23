import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Budget, Category, Transaction } from '../types';
import { Target, Plus, AlertCircle, CheckCircle2, TrendingUp, Trash2, Edit2, X } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

import LoadingSpinner from '../components/LoadingSpinner';

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [b, c, t] = await Promise.all([
        api.budgets.getAll(),
        api.categories.getAll(),
        api.transactions.getAll()
      ]);
      setBudgets(b);
      const expenseCats = c.filter(cat => cat.type === 'expense');
      setCategories(expenseCats);
      setTransactions(t);
      if (expenseCats.length > 0 && !categoryId) setCategoryId(expenseCats[0].id?.toString() || '');
    } finally {
      setLoading(false);
    }
  };

  if (loading && budgets.length === 0) return <LoadingSpinner message="Loading budgets..." />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.budgets.upsert({
        id: editingId as any,
        category_id: parseInt(categoryId),
        amount: parseFloat(amount),
        month
      });
      setAmount('');
      setEditingId(null);
      setSuccess(editingId ? 'Budget updated successfully' : 'Budget saved successfully');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to save budget:', err);
      setError(`Failed to save budget: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: number | string) => {
    setError(null);
    try {
      await api.budgets.delete(id);
      setDeleteConfirmId(null);
      setSuccess('Budget deleted successfully');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete budget:', err);
      setError(`Failed to delete budget: ${err.message || 'Unknown error'}`);
      setDeleteConfirmId(null);
    }
  };

  const handleEdit = (b: Budget) => {
    setEditingId(b.id);
    setCategoryId(b.category_id?.toString() || '');
    setAmount(b.amount?.toString() || '0');
    setMonth(b.month);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAmount('');
  };

  const currentMonthTransactions = transactions.filter(t => 
    t.type === 'expense' && t.date.startsWith(month)
  );

  const getSpendingForCategory = (catId: number) => {
    return currentMonthTransactions
      .filter(t => t.category_id === catId)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Budgets</h1>
        <p className="text-zinc-500">Set monthly limits for your expense categories.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Set Budget Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm space-y-6 sticky top-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Budget' : 'Set Budget'}</h2>
              {editingId && (
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">Category</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all appearance-none bg-white"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">Monthly Limit</label>
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
              <label className="text-sm font-bold text-zinc-700">Month</label>
              <input
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-accent-hover transition-all shadow-xl shadow-brand-accent/20"
            >
              <Target className="w-5 h-5" />
              {editingId ? 'Update Budget' : 'Save Budget'}
            </button>
          </form>
        </div>

        {/* Budgets Progress */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-zinc-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl gap-6 sm:gap-4">
            <div className="text-center sm:text-left w-full sm:w-auto min-w-0">
              <p className="text-zinc-400 text-sm font-medium mb-1">Total Budgeted</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight truncate">₹{budgets.filter(b => b.month === month).reduce((sum, b) => sum + b.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="h-px w-full bg-white/10 sm:hidden" />
            <div className="text-center sm:text-right w-full sm:w-auto min-w-0">
              <p className="text-zinc-400 text-sm font-medium mb-1">Total Spent</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight truncate">₹{currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <p className="text-center py-12 text-zinc-500">Loading budgets...</p>
            ) : budgets.filter(b => b.month === month).length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-black/5 text-center">
                <Target className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                <p className="text-zinc-500 font-medium">No budgets set for this month.</p>
              </div>
            ) : (
              budgets.filter(b => b.month === month).map((b, i) => {
                const spent = getSpendingForCategory(b.category_id as number);
                const percent = Math.min((spent / b.amount) * 100, 100);
                const isOver = spent > b.amount;
                const isNear = spent > b.amount * 0.8 && !isOver;

                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-zinc-900 text-lg">{b.category_name}</h3>
                        {isOver ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                            <AlertCircle className="w-3 h-3" /> Over Budget
                          </span>
                        ) : isNear ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                            <TrendingUp className="w-3 h-3" /> Nearing Limit
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                            <CheckCircle2 className="w-3 h-3" /> On Track
                          </span>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <span className="text-sm font-bold text-zinc-900">₹{spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <span className="text-sm text-zinc-400"> / ₹{b.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {deleteConfirmId === b.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(b.id)}
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
                                onClick={() => handleEdit(b)}
                                className="p-2 text-zinc-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(b.id)}
                                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        className={`h-full rounded-full transition-all ${
                          isOver ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <p className="text-xs font-bold text-zinc-400">{percent.toFixed(0)}% used</p>
                      <p className="text-xs font-bold text-zinc-400">₹{Math.max(b.amount - spent, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} remaining</p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
