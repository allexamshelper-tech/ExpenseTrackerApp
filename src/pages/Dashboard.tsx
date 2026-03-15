import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { Summary, Transaction } from '../types';
import { TrendingUp, TrendingDown, Wallet, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    Promise.all([
      api.summary.get(),
      api.transactions.getAll()
    ]).then(([s, t]) => {
      setSummary(s);
      // Filter transactions for current month
      const currentMonthTransactions = t.filter(trans => trans.date >= startOfMonth);
      setRecentTransactions(currentMonthTransactions.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;
  const stats = [
    { name: 'Total Balance', value: summary?.balance || 0, icon: Wallet, color: 'bg-brand-primary', textColor: 'text-white' },
    { name: 'Total Income', value: summary?.totalIncome || 0, icon: TrendingUp, color: 'bg-emerald-50', textColor: 'text-emerald-600' },
    { name: 'Total Expenses', value: summary?.totalExpense || 0, icon: TrendingDown, color: 'bg-red-50', textColor: 'text-red-600' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary text-2xl font-bold overflow-hidden border-2 border-white shadow-sm">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user?.name.charAt(0)
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
            <p className="text-zinc-500">Welcome back, {user?.name}! Here's your monthly summary.</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/transactions?add=true')}
          className="flex items-center gap-2 bg-brand-accent text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-accent-hover transition-all shadow-xl shadow-brand-accent/20"
        >
          <Plus className="w-5 h-5" />
          Add Transaction
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                <stat.icon className={`w-6 h-6 ${stat.name === 'Total Balance' ? 'text-white' : stat.textColor}`} />
              </div>
            </div>
            <p className="text-zinc-500 text-sm font-medium">{stat.name}</p>
            <p className="text-3xl font-bold tracking-tight mt-1">
              ₹{stat.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending by Category */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm"
        >
          <h2 className="text-xl font-bold mb-6">Spending by Category</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary?.categorySpending || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="total"
                >
                  {summary?.categorySpending.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Recent Transactions</h2>
            <button className="text-sm font-bold text-zinc-400 hover:text-black transition-colors">View All</button>
          </div>
          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <p className="text-zinc-500 text-center py-10">No transactions yet.</p>
            ) : (
              recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-2xl transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: t.category_color }}>
                      {/* Icon placeholder - would need a mapping function */}
                      <div className="text-xs font-bold uppercase">{t.category_name?.substring(0, 2)}</div>
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{t.description || t.category_name}</p>
                      <p className="text-xs text-zinc-500">{format(new Date(t.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                    {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
