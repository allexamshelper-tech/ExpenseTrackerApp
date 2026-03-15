import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Budget, Category, Transaction } from '../types';
import { Target, Plus, AlertCircle, CheckCircle2, TrendingUp, Trash2, Edit2, X } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { motion } from 'motion/react';

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
      if (expenseCats.length > 0 && !categoryId) setCategoryId(expenseCats[0].id.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.budgets.upsert({
        id: editingId as any,
        category_id: parseInt(categoryId),
        amount: parseFloat(amount),
        month
      });
      setAmount('');
      setEditingId(null);
      loadData();
    } catch (err) {
      alert('Failed to save budget');
    }
  };

  const handleDelete = async (id: number | string) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      try {
        await api.budgets.delete(id);
        loadData();
      } catch (err) {
        alert('Failed to delete budget');
      }
    }
  };

  const handleEdit = (b: Budget) => {
    setEditingId(b.id);
    setCategoryId(b.category_id.toString());
    setAmount(b.amount.toString());
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
          <div className="flex items-center justify-between bg-zinc-900 text-white p-6 rounded-3xl shadow-xl">
            <div>
              <p className="text-zinc-400 text-sm font-medium">Total Budgeted</p>
              <p className="text-3xl font-bold">₹{budgets.filter(b => b.month === month).reduce((sum, b) => sum + b.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-400 text-sm font-medium">Total Spent</p>
              <p className="text-3xl font-bold">₹{currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
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
                const spent = getSpendingForCategory(b.category_id);
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
                          <button
                            onClick={() => handleEdit(b)}
                            className="p-2 text-zinc-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
