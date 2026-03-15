import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../App';
import { ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      login(res.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logoUrl = "https://ik.imagekit.io/tlwqs45cp/Expense%20Tracker/output.jpg";

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-brand-primary/10 p-8 md:p-12 border border-brand-card-border/10"
      >
        <div className="flex flex-col items-center mb-10">
          <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl object-cover mb-4 shadow-lg" referrerPolicy="no-referrer" />
          <h1 className="text-3xl font-bold tracking-tight text-brand-primary">Welcome Back</h1>
          <p className="text-zinc-500 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all bg-zinc-50"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2 ml-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Password</label>
              <Link to="/forgot-password" size="sm" className="text-xs font-bold text-brand-primary hover:underline">
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all bg-zinc-50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-xl shadow-brand-accent/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                Sign In
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-zinc-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-primary font-bold hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
