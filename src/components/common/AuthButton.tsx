'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaUser } from 'react-icons/fa';

import { useAuth } from '@/context/AuthContext';
import SettingsModal from './SettingsModal';

export function AuthButton() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  return (
    <>
      <button
        onClick={() => setIsSettingsOpen(true)}
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
      </button>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
