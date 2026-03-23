import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface UserBadgeProps {
  role?: 'admin' | 'user';
  className?: string;
  size?: number;
}

export default function UserBadge({ role, className = '', size = 14 }: UserBadgeProps) {
  if (!role) return null;

  const isAdmin = role === 'admin';
  
  return (
    <span className={`inline-flex items-center justify-center ml-1 ${className}`} title={isAdmin ? 'Admin' : 'Verified'}>
      {isAdmin ? (
        <CheckCircle2 
          size={size} 
          className="text-red-500 fill-red-50" 
          strokeWidth={2.5}
        />
      ) : (
        <img 
          src="https://chatter.retrytech.site/asset/image/verified.svg" 
          alt="Verified" 
          style={{ width: size, height: size }}
          referrerPolicy="no-referrer"
        />
      )}
    </span>
  );
}
