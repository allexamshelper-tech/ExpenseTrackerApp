import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { User } from './types';
import { api } from './lib/api';
import { supabase } from './lib/supabase';
import { LayoutDashboard, Receipt, Tag, Target, LogOut, Menu, X, User as UserIcon, ShieldCheck, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Pages
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    api.auth.me().then(res => {
      setUser(res.user);
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.name,
          phone: session.user.user_metadata.phone,
          avatar_url: session.user.user_metadata.avatar_url,
          currency: session.user.user_metadata.currency || '₹',
          role: session.user.email === 'cbogineni@gmail.com' ? 'admin' : 'user',
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (user: User) => setUser(user);
  const logout = () => {
    api.auth.logout().then(() => setUser(null));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/" />;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: Receipt },
    { name: 'Categories', path: '/categories', icon: Tag },
    { name: 'Budgets', path: '/budgets', icon: Target },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin Panel', path: '/admin', icon: ShieldCheck });
  }

  const logoUrl = "https://ik.imagekit.io/tlwqs45cp/Expense%20Tracker/output.jpg";

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-primary p-6 shadow-2xl z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover border-2 border-white/20" referrerPolicy="no-referrer" />
          <span className="font-bold text-xl tracking-tight text-white">Expense Tracker</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                location.pathname === item.path
                  ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20 scale-105'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-semibold">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10">
          <div className="px-4 py-3 mb-4 bg-white/5 rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Logged In As</p>
              {user?.role === 'admin' && (
                <span className="text-[10px] bg-brand-accent text-white px-1.5 py-0.5 rounded-lg font-black uppercase tracking-tighter">Admin</span>
              )}
            </div>
            <p className="font-bold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-white/60 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full text-white/60 hover:text-white hover:bg-red-500/20 rounded-2xl transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-brand-primary sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
          <span className="font-bold text-lg tracking-tight text-white">Expense Tracker</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-white">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="md:hidden fixed inset-0 top-[65px] bg-brand-primary z-40 p-6 flex flex-col"
          >
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${
                    location.pathname === item.path
                      ? 'bg-brand-accent text-white'
                      : 'text-white/60 hover:bg-white/10'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-semibold">{item.name}</span>
                </Link>
              ))}
            </nav>
            <button
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="mt-auto flex items-center gap-3 px-4 py-4 text-white/60 hover:bg-red-500/20 rounded-2xl transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-semibold">Logout</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/budgets" element={<Budgets />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route 
                      path="/admin" 
                      element={
                        <AdminRoute>
                          <AdminDashboard />
                        </AdminRoute>
                      } 
                    />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
