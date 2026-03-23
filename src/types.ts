export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  currency?: string;
  role?: 'admin' | 'user';
  created_at?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
  user_role?: 'admin' | 'user';
}

export interface Category {
  id: string | number;
  user_id: string | number;
  name: string;
  type: 'income' | 'expense' | 'adjustment';
  icon: string;
  color: string;
}

export interface Transaction {
  id: string | number;
  user_id: string | number;
  category_id: string | number;
  amount: number;
  type: 'income' | 'expense' | 'adjustment';
  description: string;
  date: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface Budget {
  id: string | number;
  user_id: string | number;
  category_id: string | number;
  amount: number;
  month: string;
  category_name?: string;
}

export interface Summary {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  totalAdjustment: number;
  categorySpending: {
    name: string;
    total: number;
    color: string;
  }[];
}
