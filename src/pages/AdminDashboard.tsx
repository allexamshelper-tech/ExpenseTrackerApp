import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { User, Transaction, ActivityLog, Category } from '../types';
import { Users, Receipt, History, Search, Filter, Download, Trash2, Shield, ShieldAlert, UserPlus, X, CheckCircle2, ShieldCheck, RefreshCw, Edit2, Eye, EyeOff, AlertCircle, CheckCircle, Calendar, ChevronDown, LayoutDashboard, Tag, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { getMonthOptions } from '../lib/dateUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';

import LoadingSpinner from '../components/LoadingSpinner';
import UserBadge from '../components/UserBadge';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'logs' | 'categories'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'adjustment'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'user',
    sendEmail: true
  });
  const [creating, setCreating] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [roleToggleConfirmId, setRoleToggleConfirmId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching admin data...');
      const [usersData, transData, logsData, catsData] = await Promise.all([
        api.admin.getAllUsers(),
        api.admin.getAllTransactions(),
        api.admin.getAllLogs(),
        api.categories.getAll()
      ]);
      setUsers(usersData);
      setTransactions(transData);
      setLogs(logsData);
      setCategories(catsData);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setError(`Error fetching admin data: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncProfiles = async () => {
    setSyncing(true);
    try {
      const result = await api.admin.syncProfiles();
      setSuccess(`Sync complete! ${result.synced.length} profiles created.`);
      fetchData();
    } catch (err: any) {
      console.error('Sync error:', err);
      setError(`Sync failed: ${err.message || 'Unknown error'}. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in the Secrets menu.`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteUser = async (id: string) => {
    try {
      await api.admin.deleteUser(id);
      setDeleteConfirmId(null);
      setSuccess('User deleted successfully');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await api.admin.updateUserRole(user.id, newRole);
      setRoleToggleConfirmId(null);
      setSuccess(`User role updated to ${newRole}`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setNewUser({
      email: user.email,
      password: '',
      name: user.name || '',
      phone: user.phone || '',
      role: user.role,
      sendEmail: false
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setCreating(true);
    try {
      await api.admin.updateUser(selectedUser.id, {
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role as any
      });
      setShowEditModal(false);
      fetchData();
      setSuccess('User updated successfully');
    } catch (err: any) {
      setError(`Error updating user: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.admin.createUser(newUser);
      setShowCreateModal(false);
      setNewUser({
        email: '',
        password: '',
        name: '',
        phone: '',
        role: 'user',
        sendEmail: true
      });
      fetchData();
      setSuccess('User created successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(u =>
    ((u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
     (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterRole === 'all' || u.role === filterRole)
  );

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = (t.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    
    let matchesMonth = true;
    if (selectedMonth !== 'all') {
      const transDate = new Date(t.date);
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      matchesMonth = isWithinInterval(transDate, { start, end });
    }
    
    return matchesSearch && matchesType && matchesMonth;
  });

  const filteredLogs = logs.filter(l =>
    ((l.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
     (l.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
     (l.details || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate user balances from all transactions
  const userBalances = transactions.reduce((acc: Record<string, number>, t) => {
    const amount = Number(t.amount) || 0;
    if (t.type === 'income' || t.type === 'adjustment') {
      acc[t.user_id] = (acc[t.user_id] || 0) + amount;
    } else if (t.type === 'expense') {
      acc[t.user_id] = (acc[t.user_id] || 0) - amount;
    }
    return acc;
  }, {});

  // Chart Data
  const userStats = users.reduce((acc: any, user) => {
    const date = format(new Date(user.created_at || Date.now()), 'MMM yyyy');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(userStats).map(([name, value]) => ({ name, value: value as number }));

  // Overview calculations
  const overviewStats = transactions.reduce((acc, t) => {
    const transDate = new Date(t.date);
    let matchesMonth = true;
    if (selectedMonth !== 'all') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      matchesMonth = isWithinInterval(transDate, { start, end });
    }

    if (matchesMonth) {
      if (t.type === 'income') acc.income += t.amount;
      if (t.type === 'expense') acc.expense += t.amount;
      acc.activeUsers.add(t.user_id);
      
      // Category stats
      if (t.type === 'expense') {
        const catName = t.category_name || 'Other';
        acc.categoryStats[catName] = (acc.categoryStats[catName] || 0) + t.amount;
      }

      // User activity
      acc.userActivity[t.user_id] = (acc.userActivity[t.user_id] || 0) + 1;
    }
    return acc;
  }, { income: 0, expense: 0, activeUsers: new Set<string>(), categoryStats: {} as Record<string, number> , userActivity: {} as Record<string, number> });

  const topUsers = Object.entries(overviewStats.userActivity)
    .map(([id, count]) => {
      const user = users.find(u => u.id === id);
      return { id, count: count as number, name: user?.name || 'Unknown', email: user?.email || 'No Email' };
    })
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 5);

  const topUsersByBalance = [...users]
    .sort((a, b) => (userBalances[b.id] || 0) - (userBalances[a.id] || 0))
    .slice(0, 5);

  const overviewPieData = [
    { name: 'Income', value: overviewStats.income, color: '#10b981' },
    { name: 'Expense', value: overviewStats.expense, color: '#ef4444' }
  ];

  const categoryChartData = Object.entries(overviewStats.categoryStats)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => (b.value as number) - (a.value as number));

  if (loading) return <LoadingSpinner message="Loading admin dashboard..." />;

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 border border-red-100"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium flex-1">{error}</p>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center gap-3 border border-emerald-100"
          >
            <CheckCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium flex-1">{success}</p>
            <button onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Admin Dashboard</h1>
          <p className="text-zinc-500">Manage users and monitor system activity</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:border-brand-primary outline-none text-sm w-full sm:w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncProfiles}
              disabled={syncing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl font-bold hover:bg-zinc-200 transition-all text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/10 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-brand-card-border/10 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-brand-card-border/10 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-50 rounded-2xl text-green-600">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">Total Transactions</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-brand-card-border/10 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
              <History className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">Total Logs</p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-zinc-100 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          <Users className="w-4 h-4" />
          Users
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'transactions' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          <Receipt className="w-4 h-4" />
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'logs' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          <History className="w-4 h-4" />
          Activity Logs
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'categories' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          <Tag className="w-4 h-4" />
          Categories
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-brand-card-border/10 shadow-sm overflow-hidden">
        {activeTab === 'overview' && (
          <div className="space-y-8 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900">System Overview</h2>
              <div className="flex items-center gap-2 bg-zinc-50 p-1 rounded-xl border border-zinc-100">
                <Calendar className="w-4 h-4 ml-2 text-zinc-400" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent px-3 py-1.5 text-xs font-bold outline-none appearance-none cursor-pointer pr-8"
                >
                  <option value="all">All Time</option>
                  {getMonthOptions(60).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 -ml-7 mr-2 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition-all"
              >
                <p className="text-emerald-600 text-sm font-medium mb-1">Total Income</p>
                <p className="text-2xl font-bold text-emerald-900">₹{overviewStats.income.toLocaleString()}</p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-red-50 p-6 rounded-3xl border border-red-100 shadow-sm hover:shadow-md transition-all"
              >
                <p className="text-red-600 text-sm font-medium mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-red-900">₹{overviewStats.expense.toLocaleString()}</p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition-all"
              >
                <p className="text-blue-600 text-sm font-medium mb-1">Net Flow</p>
                <p className="text-2xl font-bold text-blue-900">₹{(overviewStats.income - overviewStats.expense).toLocaleString()}</p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-purple-50 p-6 rounded-3xl border border-purple-100 shadow-sm hover:shadow-md transition-all"
              >
                <p className="text-purple-600 text-sm font-medium mb-1">Active Users</p>
                <p className="text-2xl font-bold text-purple-900">{overviewStats.activeUsers.size}</p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                <h3 className="text-lg font-bold text-zinc-900 mb-6">Income vs Expense</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overviewPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {overviewPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => `₹${value.toLocaleString()}`}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                <h3 className="text-lg font-bold text-zinc-900 mb-6">System Spending by Category</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData.slice(0, 6)} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => `₹${value.toLocaleString()}`}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top Active Users */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-zinc-900">Top Active Users</h3>
                  <p className="text-xs text-zinc-500">By transaction count</p>
                </div>
                <div className="space-y-4">
                  {topUsers.map((user) => (
                    <div key={user.id} className="bg-white p-4 rounded-2xl border border-zinc-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-900 truncate text-sm">{user.name}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <p className="text-xs font-bold text-brand-primary bg-brand-primary/5 px-2 py-1 rounded-lg">
                          {user.count} Trans.
                        </p>
                        <button
                          onClick={() => navigate(`/admin/user/${user.id}`)}
                          className="text-[10px] font-bold text-zinc-400 hover:text-brand-primary transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                  {topUsers.length === 0 && (
                    <div className="py-8 text-center text-zinc-500 text-sm italic">
                      No user activity found
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-zinc-900">Top Users by Balance</h3>
                  <p className="text-xs text-zinc-500">Current wallet balance</p>
                </div>
                <div className="space-y-4">
                  {topUsersByBalance.map((user) => (
                    <div key={user.id} className="bg-white p-4 rounded-2xl border border-zinc-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-900 truncate text-sm">{user.name}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                          ₹{(userBalances[user.id] || 0).toLocaleString()}
                        </p>
                        <button
                          onClick={() => navigate(`/admin/user/${user.id}`)}
                          className="text-[10px] font-bold text-zinc-400 hover:text-brand-primary transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                  {topUsersByBalance.length === 0 && (
                    <div className="py-8 text-center text-zinc-500 text-sm italic">
                      No user data found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
              {(['all', 'admin', 'user'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    filterRole === role 
                      ? 'bg-zinc-900 text-white shadow-lg shadow-black/10' 
                      : 'bg-white text-zinc-500 border border-zinc-100 hover:border-zinc-200'
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.name || 'User'} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              (user.name || 'U').charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 flex items-center">
                              {user.name}
                              <UserBadge role={user.role} className="ml-1" />
                            </p>
                            <p className="text-xs text-zinc-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{user.phone || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{format(new Date(user.created_at || Date.now()), 'PP')}</td>
                      <td className="px-6 py-4">
                        <p className={`text-sm font-bold ${(userBalances[user.id] || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ₹{(userBalances[user.id] || 0).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit ${user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.role}
                          {user.role === 'admin' ? (
                            <ShieldCheck className="w-3 h-3 text-red-600" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/admin/user/${user.id}`)}
                            title="Review User Dashboard & Transactions"
                            className="flex items-center gap-2 px-3 py-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all font-bold text-xs"
                          >
                            <Eye className="w-4 h-4" />
                            Review
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            title="Edit User"
                            className="p-2 text-zinc-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRoleToggleConfirmId(user.id)}
                            title={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            className="p-2 text-zinc-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all"
                          >
                            {user.role === 'admin' ? <ShieldAlert className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(user.id)}
                            title="Delete User"
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden divide-y divide-zinc-100">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name || 'User'} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          (user.name || 'U').charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-900 truncate flex items-center">
                          {user.name}
                          <UserBadge role={user.role} className="ml-1" />
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 ${user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.role}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex flex-col">
                      <span>{user.phone || 'No phone'}</span>
                      <span>Joined {format(new Date(user.created_at || Date.now()), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${(userBalances[user.id] || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ₹{(userBalances[user.id] || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Balance</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-50">
                    <button
                      onClick={() => navigate(`/admin/user/${user.id}`)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary active:bg-brand-primary active:text-white rounded-lg transition-all font-bold text-[10px]"
                    >
                      <Eye className="w-3 h-3" />
                      Review Dashboard
                    </button>
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-2 text-zinc-400 hover:text-brand-primary active:bg-brand-primary/10 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRoleToggleConfirmId(user.id)}
                      className="p-2 text-zinc-400 hover:text-brand-primary active:bg-brand-primary/10 rounded-lg transition-all"
                    >
                      {user.role === 'admin' ? <ShieldAlert className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(user.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 active:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {(['all', 'income', 'expense', 'adjustment'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      filterType === type 
                        ? 'bg-zinc-900 text-white shadow-lg shadow-black/10' 
                        : 'bg-white text-zinc-500 border border-zinc-100 hover:border-zinc-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-zinc-100 shadow-sm">
                <Calendar className="w-4 h-4 ml-3 text-zinc-400" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent px-3 py-2 text-xs font-bold outline-none appearance-none cursor-pointer pr-8"
                >
                  <option value="all">All Months</option>
                  {getMonthOptions(60).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 -ml-7 mr-3 text-zinc-400 pointer-events-none" />
              </div>
            </div>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Transaction</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900 flex items-center">
                          {t.user_name}
                          <UserBadge role={t.user_role as any} className="ml-1" />
                        </p>
                        <p className="text-xs text-zinc-500">{t.user_email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${t.category_color}20`, color: t.category_color }}>
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900">{t.description}</p>
                            <p className="text-xs text-zinc-500">{t.category_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`font-bold ${t.type === 'income' || t.type === 'adjustment' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {t.type === 'income' || t.type === 'adjustment' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{format(new Date(t.date), 'PP')}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/admin/user/${t.user_id}`)}
                          className="px-3 py-1.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg transition-all font-bold text-[10px]"
                        >
                          Review User
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden divide-y divide-zinc-100">
              {filteredTransactions.map((t) => (
                <div key={t.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-zinc-900 truncate flex items-center">
                        {t.user_name}
                        <UserBadge role={t.user_role as any} className="ml-1" />
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">{t.user_email}</p>
                    </div>
                    <p className={`font-bold shrink-0 ${t.type === 'income' || t.type === 'adjustment' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'income' || t.type === 'adjustment' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-zinc-50 p-2 rounded-xl">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${t.category_color}20`, color: t.category_color }}>
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-900 truncate">{t.description}</p>
                      <p className="text-[10px] text-zinc-500">{t.category_name} • {format(new Date(t.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                    <button
                      onClick={() => navigate(`/admin/user/${t.user_id}`)}
                      className="text-[10px] font-bold text-brand-primary hover:underline"
                    >
                      Review User Dashboard
                    </button>
                    <p className="text-[10px] text-zinc-400">{format(new Date(t.date), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="p-6">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-zinc-900 flex items-center">
                        {log.user_name}
                        <UserBadge role={log.user_role as any} className="ml-1" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-zinc-100 rounded-lg text-xs font-bold text-zinc-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{log.details}</td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{format(new Date(log.created_at), 'PPp')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden divide-y divide-zinc-100">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-zinc-900 flex items-center">
                      {log.user_name}
                      <UserBadge role={log.user_role as any} className="ml-1" />
                    </p>
                    <span className="px-2 py-0.5 bg-zinc-100 rounded-lg text-[10px] font-bold text-zinc-700">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600">{log.details}</p>
                  <p className="text-[10px] text-zinc-400">{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900">System Categories</h2>
              <button
                onClick={() => {
                  setError('Category management is coming soon!');
                }}
                className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-primary/90 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                New Category
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: cat.color }}
                    >
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{cat.name}</p>
                      <p className="text-xs text-zinc-500">{cat.type.charAt(0).toUpperCase() + cat.type.slice(1)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-zinc-400 hover:text-brand-primary rounded-lg transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-zinc-400 hover:text-red-600 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-zinc-900">Edit User</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-zinc-100 rounded-xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Phone Number</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary outline-none transition-all"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary outline-none transition-all appearance-none bg-white"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-primary/90 transition-all shadow-xl shadow-brand-primary/20 disabled:opacity-50"
              >
                {creating ? 'Updating...' : 'Update User'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Create New User</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary outline-none"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Phone (Optional)</label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary outline-none"
                    placeholder="+91..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary outline-none"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Password</label>
                <div className="relative">
                  <input
                    type={showNewUserPassword ? "text" : "password"}
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary outline-none pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-brand-primary transition-colors"
                  >
                    {showNewUserPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary outline-none bg-white"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={newUser.sendEmail}
                  onChange={(e) => setNewUser({ ...newUser, sendEmail: e.target.checked })}
                  className="w-5 h-5 rounded border-zinc-300 text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="sendEmail" className="text-sm font-medium text-zinc-700 cursor-pointer">
                  Send credentials to user's email
                </label>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-primary/90 transition-all disabled:opacity-50"
              >
                {creating ? 'Creating User...' : 'Create User'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Delete User?</h2>
              <p className="text-zinc-500 mb-8">Are you sure you want to delete this user? All their data will be permanently lost.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteConfirmId)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {roleToggleConfirmId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-brand-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-brand-primary" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Change User Role?</h2>
              <p className="text-zinc-500 mb-8">
                Are you sure you want to change this user's role? This will change their access level.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setRoleToggleConfirmId(null)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const user = users.find(u => u.id === roleToggleConfirmId);
                    if (user) handleToggleRole(user);
                  }}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold bg-brand-primary text-white hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
