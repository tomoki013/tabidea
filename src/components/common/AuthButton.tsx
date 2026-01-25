'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaUser, FaMapMarkedAlt, FaSignOutAlt, FaChevronDown } from 'react-icons/fa';

import { useAuth } from '@/context/AuthContext';

export function AuthButton() {
  const { user, isLoading, isAuthenticated, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-[#e67e22]/20 animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/auth/login"
        className="flex items-center gap-1.5 font-medium text-sm text-[#e67e22] hover:text-[#d35400] transition-colors group"
      >
        <FaUser className="text-[#e67e22]/70 group-hover:text-[#d35400] transition-colors" />
        <span>ログイン</span>
      </Link>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-[#e67e22]/10 transition-all group"
        aria-label="ユーザーメニュー"
      >
        {user?.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.displayName || 'ユーザー'}
            width={32}
            height={32}
            className="rounded-full ring-2 ring-[#e67e22]/20 group-hover:ring-[#e67e22]/40 transition-all"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#e67e22]/10 ring-2 ring-[#e67e22]/20 flex items-center justify-center group-hover:ring-[#e67e22]/40 transition-all">
            <span className="text-[#e67e22] text-sm font-bold">
              {user?.displayName?.[0] || user?.email?.[0] || 'U'}
            </span>
          </div>
        )}
        <FaChevronDown className={`text-xs text-[#e67e22]/60 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-3 w-64 bg-[#fcfbf9] rounded-xl shadow-xl border-2 border-dashed border-[#e67e22]/20 py-2 z-50 overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3 bg-[#e67e22]/5 border-b border-dashed border-[#e67e22]/20">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.displayName || 'ユーザー'}
                  width={40}
                  height={40}
                  className="rounded-full ring-2 ring-[#e67e22]/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#e67e22]/10 ring-2 ring-[#e67e22]/30 flex items-center justify-center">
                  <span className="text-[#e67e22] text-lg font-bold">
                    {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stone-800 truncate">
                  {user?.displayName || 'ユーザー'}
                </p>
                <p className="text-xs text-stone-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-2">
            <Link
              href="/my-plans"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-[#e67e22]/5 hover:text-[#e67e22] transition-colors group"
            >
              <FaMapMarkedAlt className="text-[#e67e22]/50 group-hover:text-[#e67e22] transition-colors" />
              <span className="font-medium">マイプラン</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-dashed border-stone-200 py-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-500 hover:bg-red-50 hover:text-red-600 transition-colors group"
            >
              <FaSignOutAlt className="text-stone-400 group-hover:text-red-500 transition-colors" />
              <span className="font-medium">ログアウト</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
