import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { User, Transaction, ActivityLog, Category } from '../types';
import { Users, Receipt, History, Search, Filter, Download, Trash2, Shield, ShieldAlert, UserPlus, X, CheckCircle2, ShieldCheck, RefreshCw, Edit2, Eye, EyeOff, AlertCircle, CheckCircle, Calendar, ChevronDown, LayoutDashboard, Tag, Plus, DollarSign, Activity, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
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
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
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
    setError(null);
    
    // Check backend health
    try {
      const healthRes = await fetch('/api/health').catch(() => ({ ok: false }));
      setBackendStatus(healthRes.ok ? 'online' : 'offline');
    } catch {
      setBackendStatus('offline');
    }

    try {
      console.log('Fetching admin data...');
      const results = await Promise.allSettled([
        api.admin.getAllUsers(),
        api.admin.getAllTransactions(),
        api.admin.getAllLogs(),
        api.categories.getAll()
      ]);

      const [usersRes, transRes, logsRes, catsRes] = results;

      if (usersRes.status === 'fulfilled') setUsers(usersRes.value);
      else console.error('Error fetching users:', usersRes.reason);

      if (transRes.status === 'fulfilled') setTransactions(transRes.value);
      else console.error('Error fetching transactions:', transRes.reason);

      if (logsRes.status === 'fulfilled') setLogs(logsRes.value);
      else console.error('Error fetching logs:', logsRes.reason);

      if (catsRes.status === 'fulfilled') setCategories(catsRes.value);
      else console.error('Error fetching categories:', catsRes.reason);

      // If all failed, show a big error
      if (usersRes.status === 'rejected' && transRes.status === 'rejected' && logsRes.status === 'rejected') {
        const firstError = (usersRes as any).reason?.message || 'Unknown error';
        let msg = firstError;
        if (msg.includes('Expected JSON')) {
          msg = 'Invalid response from server. This usually means your backend server is not running or is not reachable. If you are on Netlify, ensure you have set up Supabase RLS policies to allow admin access, as the backend server is not available there.';
        }
        setError(`Critical error fetching admin data: ${msg}`);
      } else if (usersRes.status === 'rejected' || transRes.status === 'rejected' || logsRes.status === 'rejected') {
        // Partial failure
        setError('Some data could not be loaded. Please check the console for details.');
      }
    } catch (err: any) {
      console.error('Unexpected error in fetchData:', err);
      setError(`Unexpected error: ${err.message || 'Unknown error'}`);
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
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-primary tracking-tight">Admin Control Center</h1>
          <p className="text-brand-text/60 font-medium">Manage users, monitor activity, and analyze platform growth.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
            backendStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
            backendStatus === 'offline' ? 'bg-red-50 text-red-600 border-red-100' : 
            'bg-gray-50 text-gray-600 border-gray-100'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              backendStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 
              backendStatus === 'offline' ? 'bg-red-500' : 
              'bg-gray-400'
            }`} />
            {backendStatus === 'online' ? 'Backend Online' : backendStatus === 'offline' ? 'Backend Offline' : 'Checking Backend...'}
          </div>
          
          <button
            onClick={fetchData}
            className="p-2 hover:bg-brand-primary/5 rounded-xl transition-colors text-brand-primary"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-start gap-3 border border-red-100 shadow-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold">System Alert</p>
              <p className="text-sm opacity-90">{error}</p>
              {backendStatus === 'offline' && (
                <p className="text-xs mt-2 font-semibold underline">
                  Note: You appear to be on a static host (like Netlify). Admin features requiring a backend server will be unavailable.
                </p>
              )}
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        {/* ... success message remains similar ... */}

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

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-brand-primary rounded-2xl shadow-lg shadow-brand-primary/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-brand-primary uppercase">Admin Control</h1>
          </div>
          <p className="text-brand-text/40 font-bold uppercase tracking-widest text-xs">System Management & Analytics Platform</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 sm:flex-none group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/30 group-focus-within:text-brand-primary transition-all" />
            <input
              type="text"
              placeholder="GLOBAL SEARCH..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary focus:ring-8 focus:ring-brand-primary/5 outline-none text-xs w-full sm:w-80 bg-white transition-all font-black uppercase tracking-widest placeholder:text-brand-text/20"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSyncProfiles}
              disabled={syncing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-white text-brand-primary border border-brand-primary/10 px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-primary/5 transition-all text-[10px] disabled:opacity-50 shadow-sm"
              title="Sync Auth users with Profiles"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-brand-primary text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-primary/90 transition-all shadow-xl shadow-brand-primary/20 text-[10px]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Provision User</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Stats Overview Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-[2rem] border border-brand-primary/5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-brand-primary/10 rounded-2xl text-brand-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-text/40 uppercase tracking-widest">Total Users</p>
              <p className="text-2xl font-black text-brand-primary">{users.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-[2rem] border border-brand-primary/5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-brand-accent/10 rounded-2xl text-brand-accent">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-text/40 uppercase tracking-widest">Transactions</p>
              <p className="text-2xl font-black text-brand-primary">{transactions.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-[2rem] border border-brand-primary/5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-text/40 uppercase tracking-widest">Total Volume</p>
              <p className="text-2xl font-black text-brand-primary">
                ${transactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-[2rem] border border-brand-primary/5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-50 rounded-2xl text-indigo-600">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-text/40 uppercase tracking-widest">System Logs</p>
              <p className="text-2xl font-black text-brand-primary">{logs.length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-brand-primary/5 rounded-2xl w-full lg:w-fit overflow-x-auto no-scrollbar border border-brand-primary/10">
        {[
          { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
          { id: 'users', icon: Users, label: 'Users' },
          { id: 'transactions', icon: Receipt, label: 'Transactions' },
          { id: 'logs', icon: History, label: 'Activity Logs' },
          { id: 'categories', icon: Tag, label: 'Categories' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-brand-primary shadow-sm ring-1 ring-brand-primary/5' 
                : 'text-brand-text/50 hover:text-brand-primary hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-brand-card-border/10 shadow-sm overflow-hidden">
        {activeTab === 'overview' && (
          <div className="space-y-8 p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-brand-primary">System Overview</h2>
                <p className="text-brand-text/60 font-medium text-sm">Real-time platform metrics and financial health.</p>
              </div>
              <div className="flex items-center gap-2 bg-brand-primary/5 p-1.5 rounded-2xl border border-brand-primary/10 self-start">
                <Calendar className="w-4 h-4 ml-2 text-brand-primary/40" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent px-3 py-1.5 text-xs font-black outline-none appearance-none cursor-pointer pr-8 text-brand-primary"
                >
                  <option value="all">All Time History</option>
                  {getMonthOptions(60).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 -ml-7 mr-2 text-brand-primary/40 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider">Total Income</p>
                </div>
                <p className="text-3xl font-black text-emerald-900">₹{overviewStats.income.toLocaleString()}</p>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-red-50/50 p-6 rounded-[2rem] border border-red-100 shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-red-100 rounded-xl text-red-600">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <p className="text-red-600 text-xs font-bold uppercase tracking-wider">Total Expenses</p>
                </div>
                <p className="text-3xl font-black text-red-900">₹{overviewStats.expense.toLocaleString()}</p>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">Net Flow</p>
                </div>
                <p className="text-3xl font-black text-blue-900">₹{(overviewStats.income - overviewStats.expense).toLocaleString()}</p>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-brand-primary/5 p-6 rounded-[2rem] border border-brand-primary/10 shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                    <Users className="w-4 h-4" />
                  </div>
                  <p className="text-brand-primary text-xs font-bold uppercase tracking-wider">Active Users</p>
                </div>
                <p className="text-3xl font-black text-brand-primary">{overviewStats.activeUsers.size}</p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-brand-primary/5 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-brand-primary">Income Distribution</h3>
                  <div className="p-2 bg-brand-primary/5 rounded-xl">
                    <PieChartIcon className="w-5 h-5 text-brand-primary" />
                  </div>
                </div>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overviewPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {overviewPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '24px', 
                          border: 'none', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          padding: '16px'
                        }}
                        formatter={(value: number) => `₹${value.toLocaleString()}`}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="text-sm font-bold text-brand-text/60 ml-2">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-brand-primary/5 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-brand-primary">Top Spending Categories</h3>
                  <div className="p-2 bg-brand-primary/5 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-brand-primary" />
                  </div>
                </div>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData.slice(0, 6)} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 13, fontWeight: 700, fill: '#3E3C7A' }}
                      />
                      <Tooltip 
                        cursor={{ fill: '#3E3C7A', fillOpacity: 0.05 }}
                        contentStyle={{ 
                          borderRadius: '24px', 
                          border: 'none', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          padding: '16px'
                        }}
                        formatter={(value: number) => `₹${value.toLocaleString()}`}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="#3E3C7A" 
                        radius={[0, 12, 12, 0]} 
                        barSize={24}
                      />
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
          <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-2 p-1 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 w-full md:w-fit overflow-x-auto no-scrollbar">
                {(['all', 'admin', 'user'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setFilterRole(role)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-wider ${
                      filterRole === role 
                        ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                        : 'text-brand-text/50 hover:text-brand-primary hover:bg-white'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-4 text-sm font-bold text-brand-text/40">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-brand-primary" />
                  <span>{users.filter(u => u.role === 'admin').length} Admins</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-brand-text/20" />
                  <span>{users.filter(u => u.role === 'user').length} Standard Users</span>
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-[2rem] border border-brand-primary/5 shadow-sm bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-primary/5 border-b border-brand-primary/10">
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest">User Profile</th>
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest">Joined Date</th>
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest">Wallet Balance</th>
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest">Access Level</th>
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest text-right">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-primary/5">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-brand-primary/[0.02] transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-lg border border-brand-primary/5 shadow-inner">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.name || 'User'} className="w-full h-full rounded-2xl object-cover" />
                            ) : (
                              (user.name || 'U').charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-black text-brand-primary flex items-center gap-2">
                              {user.name}
                              {user.role === 'admin' && <ShieldCheck className="w-4 h-4 text-brand-accent" />}
                            </p>
                            <p className="text-xs text-brand-text/40 font-bold">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-brand-text/60">
                          {format(new Date(user.created_at || Date.now()), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-[10px] text-brand-text/30 font-bold uppercase tracking-tighter">
                          {format(new Date(user.created_at || Date.now()), 'hh:mm a')}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-black ${(userBalances[user.id] || 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          ₹{(userBalances[user.id] || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-brand-primary/10 text-brand-primary'}`}>
                          {user.role}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/admin/user/${user.id}`)}
                            className="p-2.5 bg-brand-primary/5 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all"
                            title="Review Dashboard"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2.5 bg-brand-primary/5 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRoleToggleConfirmId(user.id)}
                            className="p-2.5 bg-brand-primary/5 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all"
                            title="Toggle Role"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(user.id)}
                            className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                            title="Delete Account"
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

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {filteredUsers.map((user) => (
                <motion.div 
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[2rem] border border-brand-primary/5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-lg">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name || 'User'} className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                          (user.name || 'U').charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="font-black text-brand-primary flex items-center gap-2">
                          {user.name}
                          {user.role === 'admin' && <ShieldCheck className="w-4 h-4 text-brand-accent" />}
                        </p>
                        <p className="text-xs text-brand-text/40 font-bold">{user.email}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-brand-primary/10 text-brand-primary'}`}>
                      {user.role}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-primary/5">
                    <div>
                      <p className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest mb-1">Balance</p>
                      <p className={`text-sm font-black ${(userBalances[user.id] || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ₹{(userBalances[user.id] || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest mb-1">Joined</p>
                      <p className="text-sm font-bold text-brand-text/60">
                        {format(new Date(user.created_at || Date.now()), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <button
                      onClick={() => navigate(`/admin/user/${user.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 bg-brand-primary/5 text-brand-primary py-3 rounded-xl font-bold text-xs"
                    >
                      <Eye className="w-4 h-4" />
                      Review
                    </button>
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-3 bg-brand-primary/5 text-brand-primary rounded-xl"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(user.id)}
                      className="p-3 bg-red-50 text-red-600 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-2 p-1 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 w-full md:w-fit overflow-x-auto no-scrollbar">
                {(['all', 'income', 'expense', 'adjustment'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-wider ${
                      filterType === type 
                        ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                        : 'text-brand-text/50 hover:text-brand-primary hover:bg-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-brand-primary/10 shadow-sm">
                  <Calendar className="w-4 h-4 ml-4 text-brand-primary" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent px-4 py-2.5 text-xs font-black text-brand-primary outline-none appearance-none cursor-pointer pr-10 uppercase tracking-widest"
                  >
                    <option value="all">All Time</option>
                    {getMonthOptions(60).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 -ml-8 mr-4 text-brand-primary pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-[2rem] border border-brand-primary/5 shadow-sm bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-primary/5 border-b border-brand-primary/10">
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest">User</th>
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest">Transaction Details</th>
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest">Amount</th>
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest">Timestamp</th>
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest text-right">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-primary/5">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-brand-primary/[0.02] transition-colors group">
                      <td className="px-8 py-5">
                        <div>
                          <p className="font-black text-brand-primary flex items-center gap-2">
                            {t.user_name}
                            {t.user_role === 'admin' && <ShieldCheck className="w-4 h-4 text-brand-accent" />}
                          </p>
                          <p className="text-xs text-brand-text/40 font-bold">{t.user_email}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-brand-primary/5 shadow-inner" style={{ backgroundColor: `${t.category_color}15`, color: t.category_color }}>
                            <Receipt className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-brand-primary">{t.category_name}</p>
                            <p className="text-xs text-brand-text/40 font-bold truncate max-w-[200px]">{t.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-black ${t.type === 'income' || t.type === 'adjustment' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {t.type === 'income' || t.type === 'adjustment' ? '+' : '-'} ₹{t.amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-brand-text/60">
                          {format(new Date(t.date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-[10px] text-brand-text/30 font-bold uppercase tracking-tighter">
                          {format(new Date(t.date), 'hh:mm a')}
                        </p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/admin/user/${t.user_id}`)}
                            className="p-2.5 bg-brand-primary/5 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all"
                            title="Review Dashboard"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {filteredTransactions.map((t) => (
                <motion.div 
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[2rem] border border-brand-primary/5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${t.category_color}15`, color: t.category_color }}>
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-brand-primary text-sm">{t.user_name}</p>
                        <p className="text-[10px] text-brand-text/40 font-bold">{t.category_name}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-black ${t.type === 'income' || t.type === 'adjustment' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {t.type === 'income' || t.type === 'adjustment' ? '+' : '-'} ₹{t.amount.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-brand-primary/5 flex items-center justify-between">
                    <p className="text-xs text-brand-text/40 font-bold truncate max-w-[150px]">{t.description}</p>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest">
                        {format(new Date(t.date), 'MMM dd')}
                      </p>
                      <button
                        onClick={() => navigate(`/admin/user/${t.user_id}`)}
                        className="text-[10px] font-black text-brand-primary uppercase tracking-tighter hover:underline"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-brand-primary uppercase tracking-widest">System Activity Logs</h2>
              <div className="p-2 bg-brand-primary/5 rounded-xl">
                <Activity className="w-5 h-5 text-brand-primary" />
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-[2rem] border border-brand-primary/5 shadow-sm bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-primary/5 border-b border-brand-primary/10">
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest">Administrator</th>
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest">Action Performed</th>
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest">Detailed Information</th>
                    <th className="px-8 py-5 text-xs font-black text-brand-primary uppercase tracking-widest text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-primary/5">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-brand-primary/[0.02] transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-brand-primary truncate max-w-[150px]">{log.user_name}</p>
                          {log.user_role === 'admin' && <ShieldCheck className="w-3 h-3 text-brand-accent" />}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1.5 bg-brand-primary/10 rounded-xl text-[10px] font-black text-brand-primary uppercase tracking-widest">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-brand-text/60 line-clamp-1">{log.details}</p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className="text-sm font-bold text-brand-text/60">
                          {format(new Date(log.created_at), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-[10px] text-brand-text/30 font-bold uppercase tracking-tighter">
                          {format(new Date(log.created_at), 'hh:mm:ss a')}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {filteredLogs.map((log) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[2rem] border border-brand-primary/5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-brand-primary text-sm">{log.user_name}</p>
                      {log.user_role === 'admin' && <ShieldCheck className="w-3 h-3 text-brand-accent" />}
                    </div>
                    <span className="px-2 py-1 bg-brand-primary/10 rounded-lg text-[10px] font-black text-brand-primary uppercase tracking-widest">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-xs text-brand-text/60 font-bold">{log.details}</p>
                  <div className="pt-4 border-t border-brand-primary/5 text-right">
                    <p className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest">
                      {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-brand-primary uppercase tracking-widest">System Categories</h2>
                <p className="text-xs font-bold text-brand-text/40 mt-1 uppercase tracking-tighter">Manage global transaction categories</p>
              </div>
              <button
                onClick={() => {
                  setError('Category management is coming soon!');
                }}
                className="flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-2xl font-black hover:bg-brand-primary/90 transition-all text-xs uppercase tracking-widest shadow-lg shadow-brand-primary/20"
              >
                <Plus className="w-4 h-4" />
                New Category
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <motion.div 
                  key={cat.id} 
                  whileHover={{ y: -5 }}
                  className="p-6 bg-white rounded-[2rem] border border-brand-primary/5 shadow-sm flex items-center justify-between group transition-all hover:shadow-xl hover:shadow-brand-primary/5"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                      style={{ backgroundColor: cat.color, boxShadow: `0 8px 16px -4px ${cat.color}40` }}
                    >
                      <Tag className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-brand-primary text-lg">{cat.name}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest mt-1 ${
                        cat.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {cat.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    <button className="p-3 bg-brand-primary/5 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-3 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl border border-brand-primary/5"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-brand-primary uppercase tracking-widest">Edit Profile</h2>
                <p className="text-[10px] font-bold text-brand-text/40 uppercase tracking-tighter mt-1">Modify user administrative details</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="p-3 hover:bg-brand-primary/5 rounded-2xl transition-all text-brand-text/40 hover:text-brand-primary"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary bg-brand-primary/[0.02] outline-none transition-all font-bold text-brand-text"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1">Phone Number</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary bg-brand-primary/[0.02] outline-none transition-all font-bold text-brand-text"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1">Administrative Role</label>
                <div className="relative">
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="w-full px-6 py-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary bg-brand-primary/[0.02] outline-none transition-all appearance-none font-black text-brand-primary uppercase tracking-widest cursor-pointer"
                  >
                    <option value="user">Standard User</option>
                    <option value="admin">System Admin</option>
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-brand-primary text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-brand-primary/90 transition-all shadow-xl shadow-brand-primary/20 disabled:opacity-50 mt-4"
              >
                {creating ? 'Processing...' : 'Save Changes'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl border border-brand-primary/5 space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-brand-primary uppercase tracking-widest">New Account</h2>
                <p className="text-[10px] font-bold text-brand-text/40 uppercase tracking-tighter mt-1">Provision a new system user</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-3 hover:bg-brand-primary/5 rounded-2xl transition-all text-brand-text/40 hover:text-brand-primary"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary bg-brand-primary/[0.02] outline-none font-bold text-brand-text"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1">Phone</label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary bg-brand-primary/[0.02] outline-none font-bold text-brand-text"
                    placeholder="+91..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary bg-brand-primary/[0.02] outline-none font-bold text-brand-text"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1">Access Password</label>
                <div className="relative">
                  <input
                    type={showNewUserPassword ? "text" : "password"}
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary bg-brand-primary/[0.02] outline-none pr-14 font-bold text-brand-text"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-text/30 hover:text-brand-primary transition-colors"
                  >
                    {showNewUserPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1">Initial Role</label>
                <div className="relative">
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary bg-brand-primary/[0.02] outline-none appearance-none font-black text-brand-primary uppercase tracking-widest cursor-pointer"
                  >
                    <option value="user">Standard User</option>
                    <option value="admin">System Admin</option>
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 bg-brand-primary/[0.03] rounded-3xl border border-brand-primary/5">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={newUser.sendEmail}
                    onChange={(e) => setNewUser({ ...newUser, sendEmail: e.target.checked })}
                    className="w-6 h-6 rounded-lg border-brand-primary/20 text-brand-primary focus:ring-brand-primary cursor-pointer"
                  />
                </div>
                <label htmlFor="sendEmail" className="text-xs font-black text-brand-primary uppercase tracking-widest cursor-pointer">
                  Auto-notify user via email
                </label>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-brand-primary text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-brand-primary/90 transition-all shadow-xl shadow-brand-primary/20 disabled:opacity-50 mt-4"
              >
                {creating ? 'Provisioning...' : 'Create Account'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl text-center border border-red-100"
            >
              <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Trash2 className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-brand-primary uppercase tracking-widest mb-3">Terminate Account?</h2>
              <p className="text-sm font-bold text-brand-text/40 uppercase tracking-tighter mb-10 leading-relaxed">
                This action is irreversible. All associated data, transactions, and logs for this user will be permanently purged from the system.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-6 py-5 rounded-[2rem] font-black uppercase tracking-widest bg-brand-primary/5 text-brand-primary hover:bg-brand-primary/10 transition-all"
                >
                  Abort
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteConfirmId)}
                  className="flex-1 px-6 py-5 rounded-[2rem] font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-all shadow-xl shadow-red-500/30"
                >
                  Purge
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {roleToggleConfirmId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl text-center border border-brand-primary/5"
            >
              <div className="w-24 h-24 bg-brand-primary/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Shield className="w-12 h-12 text-brand-primary" />
              </div>
              <h2 className="text-2xl font-black text-brand-primary uppercase tracking-widest mb-3">Modify Access?</h2>
              <p className="text-sm font-bold text-brand-text/40 uppercase tracking-tighter mb-10 leading-relaxed">
                You are about to modify the administrative privileges for this account. This will immediately affect their system access level.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setRoleToggleConfirmId(null)}
                  className="flex-1 px-6 py-5 rounded-[2rem] font-black uppercase tracking-widest bg-brand-primary/5 text-brand-primary hover:bg-brand-primary/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const user = users.find(u => u.id === roleToggleConfirmId);
                    if (user) handleToggleRole(user);
                  }}
                  className="flex-1 px-6 py-5 rounded-[2rem] font-black uppercase tracking-widest bg-brand-primary text-white hover:bg-brand-primary/90 transition-all shadow-xl shadow-brand-primary/30"
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
