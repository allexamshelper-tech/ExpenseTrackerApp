import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Target, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.register({ name, email, password, phone });
      
      // Send welcome email
      try {
        await fetch('/api/email/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name,
            details: `Email: ${email}\nPhone: ${phone}`
          })
        });
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr);
      }

      navigate('/login');
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
          <h1 className="text-3xl font-bold tracking-tight text-brand-primary">Create Account</h1>
          <p className="text-zinc-500 mt-2">Join Expense Tracker today</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all bg-zinc-50"
              placeholder="John Doe"
            />
          </div>
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
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all bg-zinc-50"
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Password</label>
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
                Sign Up
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="text-black font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
