import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.auth.forgotPassword(identifier);
      setSuccess(true);
      setTimeout(() => {
        navigate(`/reset-password?identifier=${encodeURIComponent(identifier)}`);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl shadow-brand-primary/10 border border-brand-card-border/10"
      >
        <Link to="/login" className="inline-flex items-center gap-2 text-zinc-400 hover:text-brand-primary transition-colors mb-8 font-bold text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 mb-2">Forgot Password?</h1>
          <p className="text-zinc-500">Enter your email or mobile number to receive an OTP.</p>
        </div>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-emerald-900 font-bold text-lg mb-2">OTP Sent!</h3>
            <p className="text-emerald-700 text-sm">We've sent a 6-digit code to your registered email address. Redirecting to reset page...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 ml-1">Email or Mobile</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all font-medium"
                  placeholder="Enter email or mobile"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-brand-primary/90 transition-all shadow-xl shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Send OTP'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
