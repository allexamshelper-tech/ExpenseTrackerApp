import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { User, Transaction, ActivityLog } from '../types';
import { Users, Receipt, History, Search, Filter, Download, Trash2, Shield, ShieldAlert, UserPlus, X, CheckCircle2, ShieldCheck, RefreshCw, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'logs'>('users');
  const [searchTerm, setSearchTerm] = useState('');
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

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching admin data...');
      const [usersData, transData, logsData] = await Promise.all([
        api.admin.getAllUsers(),
        api.admin.getAllTransactions(),
        api.admin.getAllLogs()
      ]);
      console.log('Admin data fetched:', { 
        usersCount: usersData.length, 
        transCount: transData.length, 
        logsCount: logsData.length 
      });
      setUsers(usersData);
      setTransactions(transData);
      setLogs(logsData);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      alert(`Error fetching admin data: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncProfiles = async () => {
    setSyncing(true);
    try {
      const result = await api.admin.syncProfiles();
      alert(`Sync complete! ${result.synced.length} profiles created.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to sync profiles');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteUser = async (id: string) => {
    if (confirm('Are you sure you want to delete this user? All their data will be lost.')) {
      try {
        await api.admin.deleteUser(id);
        fetchData();
      } catch (err) {
        alert('Failed to delete user');
      }
    }
  };

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (confirm(`Change ${user.name}'s role to ${newRole}?`)) {
      try {
        await api.admin.updateUserRole(user.id, newRole);
        fetchData();
      } catch (err) {
        alert('Failed to update role');
      }
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
      alert('User updated successfully');
    } catch (err: any) {
      alert(`Error updating user: ${err.message}`);
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
      alert('User created successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t => 
    (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = logs.filter(l => 
    (l.action || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Chart Data
  const userStats = users.reduce((acc: any, user) => {
    const date = format(new Date(user.created_at || Date.now()), 'MMM yyyy');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(userStats).map(([name, value]) => ({ name, value }));

  if (loading) return <LoadingSpinner message="Loading admin dashboard..." />;

  return (
    <div className="space-y-8">
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
          onClick={() => setActiveTab('users')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'transactions' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'logs' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          Activity Logs
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-brand-card-border/10 shadow-sm overflow-hidden">
        {activeTab === 'users' && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Joined</th>
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
                            <p className="font-bold text-zinc-900">{user.name}</p>
                            <p className="text-xs text-zinc-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{user.phone || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{format(new Date(user.created_at || Date.now()), 'PP')}</td>
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
                            onClick={() => handleEditUser(user)}
                            title="Edit User"
                            className="p-2 text-zinc-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleRole(user)}
                            title={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            className="p-2 text-zinc-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all"
                          >
                            {user.role === 'admin' ? <ShieldAlert className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
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
                        <p className="font-bold text-zinc-900 truncate">{user.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 ${user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.role}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{user.phone || 'No phone'}</span>
                    <span>Joined {format(new Date(user.created_at || Date.now()), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-50">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-2 text-zinc-400 hover:text-brand-primary active:bg-brand-primary/10 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleRole(user)}
                      className="p-2 text-zinc-400 hover:text-brand-primary active:bg-brand-primary/10 rounded-lg transition-all"
                    >
                      {user.role === 'admin' ? <ShieldAlert className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 active:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'transactions' && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Transaction</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900">{t.user_name}</p>
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
                        <p className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{format(new Date(t.date), 'PP')}</td>
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
                      <p className="font-bold text-zinc-900 truncate">{t.user_name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{t.user_email}</p>
                    </div>
                    <p className={`font-bold shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
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
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'logs' && (
          <>
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
                      <td className="px-6 py-4 font-bold text-zinc-900">{log.user_name}</td>
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
                    <p className="font-bold text-zinc-900">{log.user_name}</p>
                    <span className="px-2 py-0.5 bg-zinc-100 rounded-lg text-[10px] font-bold text-zinc-700">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600">{log.details}</p>
                  <p className="text-[10px] text-zinc-400">{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
              ))}
            </div>
          </>
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
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary outline-none"
                  placeholder="••••••••"
                />
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
    </div>
  );
}
