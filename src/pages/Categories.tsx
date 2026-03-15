import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Category } from '../types';
import { Plus, Trash2, Tag, Palette, Type } from 'lucide-react';
import { motion } from 'motion/react';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'adjustment'>('expense');
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const c = await api.categories.getAll();
      setCategories(c);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.categories.create({ name, type, color, icon: 'Tag' });
      setName('');
      loadCategories();
    } catch (err) {
      alert('Failed to add category');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure? This will not delete transactions in this category, but they will lose their category info.')) {
      await api.categories.delete(id);
      loadCategories();
    }
  };

  const handleSeedDefaults = async () => {
    const defaultCategories = [
      // Income
      { name: "Salary", type: "income", icon: "Wallet", color: "#10b981" },
      { name: "Bonus", type: "income", icon: "TrendingUp", color: "#059669" },
      { name: "Freelance", type: "income", icon: "Briefcase", color: "#3b82f6" },
      { name: "Investment", type: "income", icon: "BarChart", color: "#8b5cf6" },
      { name: "Rental Income", type: "income", icon: "Home", color: "#14b8a6" },
      { name: "Gifts", type: "income", icon: "Gift", color: "#ec4899" },
      
      // Expense
      { name: "Food & Dining", type: "expense", icon: "Utensils", color: "#ef4444" },
      { name: "Transport", type: "expense", icon: "Car", color: "#3b82f6" },
      { name: "Rent & Bills", type: "expense", icon: "Home", color: "#8b5cf6" },
      { name: "Shopping", type: "expense", icon: "ShoppingBag", color: "#f59e0b" },
      { name: "Entertainment", type: "expense", icon: "Film", color: "#ec4899" },
      { name: "Health", type: "expense", icon: "HeartPulse", color: "#f43f5e" },
      { name: "Utilities", type: "expense", icon: "Zap", color: "#06b6d4" },
      { name: "Education", type: "expense", icon: "Book", color: "#4f46e5" },
      { name: "Travel", type: "expense", icon: "Plane", color: "#0ea5e9" },
      { name: "Insurance", type: "expense", icon: "Shield", color: "#64748b" },
      { name: "Maintenance", type: "expense", icon: "Settings", color: "#475569" },
      
      // Adjustment
      { name: "Opening Balance", type: "adjustment", icon: "RefreshCw", color: "#6366f1" },
      { name: "Carryover", type: "adjustment", icon: "ArrowRightLeft", color: "#4f46e5" },
      { name: "Correction", type: "adjustment", icon: "AlertCircle", color: "#f43f5e" },
      { name: "Tax Adjustment", type: "adjustment", icon: "FileText", color: "#1e293b" },
      { name: "Refund", type: "adjustment", icon: "Undo", color: "#10b981" },
    ];

    try {
      setLoading(true);
      for (const cat of defaultCategories) {
        await api.categories.create(cat as any);
      }
      await loadCategories();
    } catch (err) {
      alert('Failed to load defaults');
    } finally {
      setLoading(false);
    }
  };

  const colors = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', 
    '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#06b6d4'
  ];

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Categories</h1>
          <p className="text-zinc-500">Organize your finances with custom categories.</p>
        </div>
        {categories.length === 0 && !loading && (
          <button 
            onClick={handleSeedDefaults}
            className="text-sm font-bold text-zinc-500 hover:text-black transition-colors underline underline-offset-4"
          >
            Load Default Categories
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Category Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm space-y-6 sticky top-8">
            <h2 className="text-xl font-bold">New Category</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <Type className="w-4 h-4" /> Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                placeholder="e.g. Groceries"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">Type</label>
              <div className="flex bg-zinc-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-zinc-500'}`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500'}`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setType('adjustment')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'adjustment' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500'}`}
                >
                  Adjustment
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <Palette className="w-4 h-4" /> Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {colors.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-full aspect-square rounded-lg transition-all ${color === c ? 'ring-2 ring-black ring-offset-2 scale-90' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-accent-hover transition-all shadow-xl shadow-brand-accent/20"
            >
              <Plus className="w-5 h-5" />
              Create Category
            </button>
          </form>
        </div>

        {/* Categories List */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading ? (
              <p className="col-span-full text-center py-12 text-zinc-500">Loading categories...</p>
            ) : categories.length === 0 ? (
              <p className="col-span-full text-center py-12 text-zinc-500">No categories yet.</p>
            ) : (
              categories.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white p-5 rounded-3xl border border-black/5 shadow-sm flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: c.color }}>
                      <Tag className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900">{c.name}</h3>
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{c.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-2 text-zinc-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
