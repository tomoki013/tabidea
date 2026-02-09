"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaUser } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import SettingsModal from './SettingsModal';
import { JournalButton } from '@/components/ui/journal';
import { cn } from '@/lib/utils';

export function AuthButton() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-stone-200 animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/auth/login"
        className="flex items-center gap-1.5 group"
      >
        <div className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-4 py-2 rounded-sm border border-stone-300 border-dashed transition-all hover:-rotate-1 font-hand flex items-center gap-2">
          <FaUser className="text-stone-400 group-hover:text-primary transition-colors" />
          <span>ログイン</span>
        </div>
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-stone-100 transition-all group relative"
        aria-label="ユーザーメニュー"
      >
        {user?.avatarUrl ? (
          <div className="relative">
            <Image
              src={user.avatarUrl}
              alt={user.displayName || 'ユーザー'}
              width={36}
              height={36}
              className="rounded-full ring-2 ring-white shadow-sm group-hover:scale-105 transition-all"
            />
            {/* Stamp effect border */}
            <div className="absolute inset-0 rounded-full border-2 border-stone-200 border-dashed pointer-events-none group-hover:border-primary/30 transition-colors scale-110" />
          </div>
        ) : (
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-white transition-all shadow-sm">
              <span className="text-stone-600 font-hand font-bold text-lg">
                {user?.displayName?.[0] || user?.email?.[0] || 'U'}
              </span>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-stone-300 border-dashed pointer-events-none group-hover:border-primary/50 transition-colors scale-110" />
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
