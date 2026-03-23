import React, { useState } from 'react';
import { useAuth } from '../App';
import { api } from '../lib/api';
import { User, Camera, Phone, Mail, User as UserIcon, Globe, Save, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import UserBadge from '../components/UserBadge';

export default function Profile() {
  const { user, login } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currency, setCurrency] = useState(user?.currency || '₹');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await api.auth.updateProfile({ name, phone, currency, avatar_url: avatarUrl });
      login({ ...user!, name, phone, currency, avatar_url: avatarUrl });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Profile Settings</h1>
          <p className="text-zinc-500">Manage your personal information and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-brand-card-border/10 shadow-sm p-8 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary text-4xl font-bold overflow-hidden border-4 border-white shadow-lg">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  name.charAt(0)
                )}
                <div className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow-md">
                  {user?.role === 'admin' ? (
                    <div className="bg-red-500 p-1 rounded-full">
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="bg-blue-500 p-1 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-brand-accent text-white rounded-full shadow-lg hover:bg-brand-accent-hover transition-colors">
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 flex items-center justify-center">
              {name}
              <UserBadge role={user?.role} className="ml-1" size={18} />
            </h2>
            <p className="text-zinc-500 text-sm mb-4">{user?.email}</p>
            <div className="w-full pt-6 border-t border-zinc-100 flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <Mail className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <Phone className="w-4 h-4" />
                <span>{phone || 'No phone number'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <Globe className="w-4 h-4" />
                <span>Currency: {currency}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleUpdate} className="bg-white rounded-3xl border border-brand-card-border/10 shadow-sm p-8 space-y-6">
            {message.text && (
              <div className={`p-4 rounded-xl text-sm font-medium border ${message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Currency Symbol
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                >
                  <option value="₹">₹ (INR)</option>
                  <option value="$">$ (USD)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="£">£ (GBP)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Profile Picture URL
                </label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-brand-accent text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-accent-hover transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
