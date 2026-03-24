import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Summary, Transaction, User } from '../types';
import { TrendingUp, TrendingDown, Wallet, ArrowLeft, ShieldCheck, CheckCircle2, Calendar, ChevronDown, Receipt, Download, Copy, Check } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'motion/react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { getMonthOptions } from '../lib/dateUtils';

import LoadingSpinner from '../components/LoadingSpinner';
import UserBadge from '../components/UserBadge';
import { useAuth } from '../App';

export default function UserReview() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();
  
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let startIso: string | undefined;
    let endIso: string | undefined;

    if (selectedMonth !== 'all') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      
      startIso = start.toISOString();
      endIso = end.toISOString();
    }

    setLoading(true);
    Promise.all([
      api.admin.getAllUsers().then(users => users.find(u => u.id === userId)),
      api.summary.get(userId, startIso, endIso),
      api.transactions.getAll(userId)
    ]).then(([u, s, t]) => {
      if (!u) {
        setError("User not found");
        return;
      }
      setTargetUser(u);
      setSummary(s);
      setTransactions(t);
    })
    .catch(err => {
      console.error("Error loading user review:", err);
      setError(err.message || "Failed to load user data");
    })
    .finally(() => setLoading(false));
  }, [userId, selectedMonth]);

  const filteredTransactions = transactions.filter(t => {
    if (selectedMonth === 'all') return true;
    const transDate = new Date(t.date);
    if (isNaN(transDate.getTime())) return false;
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    return isWithinInterval(transDate, { start, end });
  });

  const recentTransactions = filteredTransactions.slice(0, 5);

  const handleExport = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Date', 'Category', 'Description', 'Type', 'Amount'];
    const rows = filteredTransactions.map(t => [
      t.date && !isNaN(new Date(t.date).getTime()) ? format(new Date(t.date), 'yyyy-MM-dd') : 'N/A',
      t.category_name || 'Uncategorized',
      t.description || '',
      t.type,
      t.amount.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${targetUser?.name?.replace(/\s+/g, '_') || 'user'}_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = () => {
    if (filteredTransactions.length === 0) return;

    const text = filteredTransactions.map(t => 
      `${t.date && !isNaN(new Date(t.date).getTime()) ? format(new Date(t.date), 'yyyy-MM-dd') : 'N/A'} | ${t.category_name} | ${t.description || '-'} | ${t.type === 'income' || t.type === 'adjustment' ? '+' : '-'}₹${t.amount}`
    ).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingSpinner message="Loading user data..." />;
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="mb-6">{error}</p>
          <button 
            onClick={() => navigate('/admin')}
            className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-all"
          >
            Back to Admin Panel
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    { name: 'Total Balance', value: summary?.balance || 0, icon: Wallet, color: 'bg-brand-primary', textColor: 'text-white' },
    { name: 'Total Income', value: summary?.totalIncome || 0, icon: TrendingUp, color: 'bg-emerald-50', textColor: 'text-emerald-600' },
    { name: 'Total Expenses', value: summary?.totalExpense || 0, icon: TrendingDown, color: 'bg-red-50', textColor: 'text-red-600' },
    { name: 'Total Adjustments', value: summary?.totalAdjustment || 0, icon: CheckCircle2, color: 'bg-emerald-50', textColor: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin')}
            className="p-3 bg-white border border-black/5 rounded-2xl text-zinc-400 hover:text-black hover:bg-zinc-50 transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary text-2xl font-bold overflow-hidden border-2 border-white shadow-sm relative shrink-0">
            {targetUser?.avatar_url ? (
              <img src={targetUser.avatar_url} alt={targetUser.name} className="w-full h-full object-cover" />
            ) : (
              (targetUser?.name || 'U').charAt(0)
            )}
            <div className="absolute bottom-0 right-0">
              {targetUser?.role === 'admin' ? (
                <div className="bg-red-500 p-0.5 rounded-md shadow-sm">
                  <ShieldCheck className="w-3 h-3 text-white" />
                </div>
              ) : (
                <img 
                  src="https://chatter.retrytech.site/asset/image/verified.svg" 
                  alt="Verified" 
                  className="w-4 h-4"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{targetUser?.name || 'User Review'}</h1>
            <p className="text-zinc-500 flex items-center gap-1">
              Admin Review Dashboard by {adminUser?.name || 'Admin'}
              <UserBadge role={targetUser?.role} className="ml-0.5" />
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-black/5 shadow-sm">
            <Calendar className="w-4 h-4 ml-3 text-zinc-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent px-3 py-2 text-sm font-bold outline-none appearance-none cursor-pointer pr-8"
            >
              <option value="all">All Time</option>
              {getMonthOptions(60).map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 -ml-7 mr-3 text-zinc-400 pointer-events-none" />
          </div>
          <div className="bg-brand-primary/5 px-4 py-2 rounded-2xl border border-brand-primary/10">
            <p className="text-xs font-bold text-brand-primary uppercase tracking-wider">Admin View Only</p>
            <p className="text-sm text-zinc-600">{targetUser?.email}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                <stat.icon className={`w-6 h-6 ${stat.name === 'Total Balance' ? 'text-white' : stat.textColor}`} />
              </div>
            </div>
            <p className="text-zinc-500 text-sm font-medium">{stat.name}</p>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 truncate">
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
          </div>
          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <p className="text-zinc-500 text-center py-10">No transactions for this period.</p>
            ) : (
              recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-2xl transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: t.category_color }}>
                      <div className="text-xs font-bold uppercase">{t.category_name?.substring(0, 2)}</div>
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{t.description || t.category_name}</p>
                      <p className="text-xs text-zinc-500">
                        {t.date && !isNaN(new Date(t.date).getTime()) 
                          ? format(new Date(t.date), 'MMM d, yyyy') 
                          : 'Invalid date'}
                      </p>
                    </div>
                  </div>
                  <div className={`font-bold ${t.type === 'income' || t.type === 'adjustment' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                    {t.type === 'income' || t.type === 'adjustment' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Full Transaction List for Admin */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
              <Receipt className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">All Transactions for Period</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all font-bold text-xs border border-zinc-200"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white hover:bg-brand-primary/90 rounded-xl transition-all font-bold text-xs shadow-lg shadow-brand-primary/20"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
        
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-zinc-100">
                <th className="pb-4 font-bold text-zinc-400 text-xs uppercase tracking-wider">Date</th>
                <th className="pb-4 font-bold text-zinc-400 text-xs uppercase tracking-wider">Category</th>
                <th className="pb-4 font-bold text-zinc-400 text-xs uppercase tracking-wider">Description</th>
                <th className="pb-4 font-bold text-zinc-400 text-xs uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-zinc-500">No transactions found.</td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="group hover:bg-zinc-50 transition-colors">
                    <td className="py-4 text-sm text-zinc-600">
                      {t.date && !isNaN(new Date(t.date).getTime()) 
                        ? format(new Date(t.date), 'MMM d, yyyy') 
                        : 'Invalid date'}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.category_color }} />
                        <span className="text-sm font-bold text-zinc-900">{t.category_name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-zinc-600">{t.description || '-'}</td>
                    <td className={`py-4 text-right font-bold ${t.type === 'income' || t.type === 'adjustment' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                      {t.type === 'income' || t.type === 'adjustment' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Transaction List */}
        <div className="md:hidden space-y-4">
          {filteredTransactions.length === 0 ? (
            <p className="py-10 text-center text-zinc-500">No transactions found.</p>
          ) : (
            filteredTransactions.map((t) => (
              <div key={t.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.category_color }} />
                    <span className="text-sm font-bold text-zinc-900">{t.category_name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {t.date && !isNaN(new Date(t.date).getTime()) 
                      ? format(new Date(t.date), 'MMM d, yyyy') 
                      : 'Invalid date'}
                  </span>
                </div>
                <p className="text-sm text-zinc-600">{t.description || 'No description'}</p>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t.type}</span>
                  <span className={`font-bold ${t.type === 'income' || t.type === 'adjustment' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                    {t.type === 'income' || t.type === 'adjustment' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
