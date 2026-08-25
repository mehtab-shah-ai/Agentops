import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';

export const Navbar: React.FC = () => {
  const { user, enterDemoMode } = useAuth();
  const navigate = useNavigate();

  const handleDemoClick = async () => {
    await enterDemoMode();
    navigate('/app');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1F2737]/80 bg-[#080A0F]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/">
          <BrandLogo size="md" />
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
          <a href="#product" className="hover:text-slate-200 transition-colors">
            Product
          </a>
          <a href="#how-it-works" className="hover:text-slate-200 transition-colors">
            How it works
          </a>
          <a href="#failures" className="hover:text-slate-200 transition-colors">
            What it catches
          </a>
          <Link to="/app" className="hover:text-slate-200 transition-colors">
            Docs
          </Link>
        </nav>

        {/* Right CTAs */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/app"
              className="flex items-center gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              <span>Open Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <button
                onClick={handleDemoClick}
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#151B27] hover:bg-[#1C2333] border border-[#232B3E] px-3.5 py-2 rounded-xl transition-colors"
              >
                <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                <span>Explore Demo</span>
              </button>

              <Link
                to="/auth"
                className="text-xs font-medium text-slate-300 hover:text-white px-3 py-2 transition-colors"
              >
                Login
              </Link>

              <Link
                to="/auth"
                className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
