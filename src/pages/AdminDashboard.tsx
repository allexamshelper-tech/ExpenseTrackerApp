import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { User, Transaction, ActivityLog } from '../types';
import { Users, Receipt, History, Search, Filter, Download, Trash2, Shield, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'logs'>('users');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, transData, logsData] = await Promise.all([
        api.admin.getAllUsers(),
        api.admin.getAllTransactions(),
        api.admin.getAllLogs()
      ]);
      setUsers(usersData);
      setTransactions(transData);
      setLogs(logsData);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
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

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Chart Data
  const userStats = users.reduce((acc: any, user) => {
    const date = format(new Date(user.created_at || Date.now()), 'MMM yyyy');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(userStats).map(([name, value]) => ({ name, value }));

  if (loading) return <div className="flex items-center justify-center h-64">Loading Admin Data...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Admin Dashboard</h1>
          <p className="text-zinc-500">Manage users and monitor system activity</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:border-brand-primary outline-none text-sm w-64"
            />
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
      <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-2 rounded-xl font-medium transition-all ${activeTab === 'users' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-6 py-2 rounded-xl font-medium transition-all ${activeTab === 'transactions' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-2 rounded-xl font-medium transition-all ${activeTab === 'logs' ? 'bg-white text-brand-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          Activity Logs
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-brand-card-border/10 shadow-sm overflow-hidden">
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
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
                            <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            user.name.charAt(0)
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
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
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
        )}

        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
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
        )}

        {activeTab === 'logs' && (
          <div className="overflow-x-auto">
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
        )}
      </div>
    </div>
  );
}
