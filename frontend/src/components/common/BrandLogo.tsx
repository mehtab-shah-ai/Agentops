import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  return (
    <div className="flex items-center gap-2.5 group cursor-pointer select-none">
      {/* Clean Electric Blue Shield Icon */}
      <div
        className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform`}
      >
        <ShieldCheck className="w-4 h-4 text-white" />
      </div>

      {/* Clean Brand Typography */}
      {showText && (
        <div className="flex items-center gap-2">
          <span className={`font-bold text-slate-100 tracking-tight font-mono ${textClasses[size]}`}>
            Agent<span className="text-blue-400">Ops</span>
          </span>
        </div>
      )}
    </div>
  );
};
