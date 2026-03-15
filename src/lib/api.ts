import { supabase } from './supabase';
import { User, Category, Transaction, Budget, Summary, ActivityLog } from '../types';

export const api = {
  auth: {
    register: async (data: any) => {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            phone: data.phone,
            currency: '₹',
          },
        },
      });
      if (error) throw error;

      // Manually insert into profiles table to ensure server-side lookups work
      // This is helpful if there's no database trigger set up
      if (authData.user) {
        try {
          await supabase.from('profiles').insert([{
            id: authData.user.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            role: data.email === 'cbogineni@gmail.com' ? 'admin' : 'user',
            currency: '₹'
          }]);
        } catch (profileErr) {
          console.error('Failed to create profile record:', profileErr);
          // Don't throw here, as auth was successful
        }
      }

      // Log activity
      await api.logs.create('Register', `User ${data.name} registered`);

      return authData;
    },
    
    login: async (data: any) => {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      
      // Log activity
      await api.logs.create('Login', `User ${authData.user.email} logged in`);

      return {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata.name,
          phone: authData.user.user_metadata.phone,
          avatar_url: authData.user.user_metadata.avatar_url,
          currency: authData.user.user_metadata.currency || '₹',
          role: authData.user.email === 'cbogineni@gmail.com' ? 'admin' : 'user',
        }
      };
    },
    
    logout: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    
    me: async (): Promise<{ user: User | null }> => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return { user: null };
      
      return {
        user: {
          id: user.id,
          email: user.email!,
          name: user.user_metadata.name,
          phone: user.user_metadata.phone,
          avatar_url: user.user_metadata.avatar_url,
          currency: user.user_metadata.currency || '₹',
          role: user.email === 'cbogineni@gmail.com' ? 'admin' : 'user',
        }
      };
    },

    updateProfile: async (data: Partial<User>) => {
      const { data: result, error } = await supabase.auth.updateUser({
        data: {
          name: data.name,
          phone: data.phone,
          currency: data.currency,
          avatar_url: data.avatar_url,
        }
      });
      if (error) throw error;

      // Log activity
      await api.logs.create('Update Profile', `User updated their profile`);

      return result;
    },

    forgotPassword: async (identifier: string) => {
      // identifier can be email or phone
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to send OTP');
      }
      return response.json();
    },

    resetPassword: async (data: any) => {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to reset password');
      }
      return response.json();
    }
  },

  admin: {
    getAllUsers: async (): Promise<User[]> => {
      // In a real app, this would be a server-side call or a special table
      // For this demo, we'll fetch from a custom 'profiles' table if it exists
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      if (error) return [];
      return data as User[];
    },
    getAllTransactions: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (name, icon, color),
          profiles (name, email)
        `)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data as any[]).map(t => ({
        ...t,
        category_name: t.categories?.name,
        category_icon: t.categories?.icon,
        category_color: t.categories?.color,
        user_name: t.profiles?.name,
        user_email: t.profiles?.email,
      })) as any[];
    },
    getAllLogs: async (): Promise<ActivityLog[]> => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ActivityLog[];
    },
    deleteUser: async (id: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await api.logs.create('Admin Action', `Deleted user ID ${id}`);
    },
    updateUserRole: async (id: string, role: 'admin' | 'user') => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id);
      if (error) throw error;
      await api.logs.create('Admin Action', `Updated user ID ${id} role to ${role}`);
    }
  },

  logs: {
    create: async (action: string, details: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('activity_logs').insert([{
        user_id: user.id,
        user_name: user.user_metadata.name || user.email,
        action,
        details,
      }]);
    }
  },

  categories: {
    getAll: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
    create: async (data: Partial<Category>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: result, error } = await supabase
        .from('categories')
        .insert([{ ...data, user_id: user?.id }])
        .select()
        .single();
      if (error) throw error;
      
      await api.logs.create('Create Category', `Created category ${data.name}`);
      return result;
    },
    delete: async (id: number | string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await api.logs.create('Delete Category', `Deleted category ID ${id}`);
    },
  },

  transactions: {
    getAll: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            name,
            icon,
            color
          )
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return (data as any[]).map(t => ({
        ...t,
        category_name: t.categories?.name,
        category_icon: t.categories?.icon,
        category_color: t.categories?.color,
      })) as Transaction[];
    },
    create: async (data: Partial<Transaction>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: result, error } = await supabase
        .from('transactions')
        .insert([{ ...data, user_id: user?.id }])
        .select()
        .single();
      if (error) {
        console.error('Transaction creation error:', error);
        throw error;
      }

      await api.logs.create('Create Transaction', `Created ${data.type} of ₹${data.amount}`);
      return result;
    },
    delete: async (id: number | string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await api.logs.create('Delete Transaction', `Deleted transaction ID ${id}`);
    },
  },

  budgets: {
    getAll: async (): Promise<Budget[]> => {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          categories (
            name
          )
        `);
      if (error) throw error;
      return (data as any[]).map(b => ({
        ...b,
        category_name: b.categories?.name
      })) as Budget[];
    },
    upsert: async (data: Partial<Budget>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: result, error } = await supabase
        .from('budgets')
        .upsert({ ...data, user_id: user?.id }, { onConflict: 'user_id,category_id,month' })
        .select()
        .single();
      if (error) throw error;
      await api.logs.create('Update Budget', `Updated budget for category ID ${data.category_id}`);
      return result;
    },
    delete: async (id: number | string) => {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await api.logs.create('Delete Budget', `Deleted budget ID ${id}`);
    },
  },

  summary: {
    get: async (): Promise<Summary> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type, category_id, categories(name, color)');
      
      if (error) throw error;

      let totalIncome = 0;
      let totalExpense = 0;
      let totalAdjustment = 0;
      const catMap: Record<string, { total: number, color: string }> = {};

      (transactions as any[]).forEach(t => {
        if (t.type === 'income') {
          totalIncome += t.amount;
        } else if (t.type === 'expense') {
          totalExpense += t.amount;
          const catName = t.categories?.name || 'Uncategorized';
          if (!catMap[catName]) {
            catMap[catName] = { total: 0, color: t.categories?.color || '#ccc' };
          }
          catMap[catName].total += t.amount;
        } else if (t.type === 'adjustment') {
          totalAdjustment += t.amount;
        }
      });

      return {
        balance: totalIncome - totalExpense + totalAdjustment,
        totalIncome,
        totalExpense,
        categorySpending: Object.entries(catMap).map(([name, data]) => ({
          name,
          total: data.total,
          color: data.color
        }))
      };
    },
  },
};
