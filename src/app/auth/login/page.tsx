'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaMapMarkerAlt, FaPlane, FaPassport, FaArrowLeft } from 'react-icons/fa';

import { useAuth } from '@/context/AuthContext';
import type { AuthProvider } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isLoading, isAuthenticated } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirect') || '/';

  // Redirect if already authenticated
  if (isAuthenticated && !isLoading) {
    router.push(redirectTo);
    return null;
  }

  const handleSignIn = async (provider: AuthProvider) => {
    setIsSigningIn(true);
    setError(null);

    try {
      await signIn(provider);
    } catch (err) {
      console.error('Sign in error:', err);
      setError('ログインに失敗しました。もう一度お試しください。');
      setIsSigningIn(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fcfbf9] px-4 py-12">
      {/* Decorative elements */}
      <div className="fixed top-20 left-10 text-[#e67e22]/10 rotate-12 hidden lg:block">
        <FaPlane className="text-8xl" />
      </div>
      <div className="fixed bottom-20 right-10 text-[#27ae60]/10 -rotate-12 hidden lg:block">
        <FaPassport className="text-8xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Card with scrapbook aesthetic */}
        <div className="relative bg-[#fcfbf9] rounded-2xl border-2 border-dashed border-[#e67e22]/30 p-8 shadow-lg">
          {/* Corner tape decorations */}
          <div className="absolute -top-2 -left-2 w-8 h-8 bg-[#e67e22]/20 rotate-45 rounded-sm" />
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#27ae60]/20 -rotate-45 rounded-sm" />

          {/* Header with travel icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e67e22]/10 mb-4">
              <FaMapMarkerAlt className="text-2xl text-[#e67e22]" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-stone-800 mb-2">
              ログイン
            </h1>
            <p className="text-stone-500 text-sm font-hand">
              あなたの旅の思い出を
              <br />
              大切に保存しましょう
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-dashed border-red-300 rounded-xl">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Google Login Button */}
            <button
              onClick={() => handleSignIn('google')}
              disabled={isSigningIn || isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-stone-200 rounded-xl hover:border-[#e67e22]/50 hover:bg-[#e67e22]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-stone-700 font-bold group-hover:text-[#e67e22] transition-colors">
                Googleでログイン
              </span>
            </button>

            {/* X Login Button - Commented out */}
            {/* <button
              onClick={() => handleSignIn('twitter')}
              disabled={isSigningIn || isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="font-bold">Xでログイン</span>
            </button> */}
          </div>

          {/* Benefits section */}
          <div className="mt-8 pt-6 border-t border-dashed border-stone-200">
            <p className="text-xs text-stone-400 text-center mb-4">
              ログインするとできること
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs text-stone-600">
              <div className="flex items-center gap-2 bg-[#e67e22]/5 p-2 rounded-lg">
                <span className="text-[#e67e22]">✓</span>
                プランの保存
              </div>
              <div className="flex items-center gap-2 bg-[#27ae60]/5 p-2 rounded-lg">
                <span className="text-[#27ae60]">✓</span>
                プランの共有
              </div>
              <div className="flex items-center gap-2 bg-[#e67e22]/5 p-2 rounded-lg">
                <span className="text-[#e67e22]">✓</span>
                いつでも閲覧
              </div>
              <div className="flex items-center gap-2 bg-[#27ae60]/5 p-2 rounded-lg">
                <span className="text-[#27ae60]">✓</span>
                複数デバイス対応
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="mt-6 pt-4 border-t border-dashed border-stone-200">
            <p className="text-xs text-stone-400 text-center">
              ログインすることで、
              <Link href="/terms" className="text-[#e67e22] hover:underline">
                利用規約
              </Link>
              と
              <Link href="/privacy" className="text-[#e67e22] hover:underline">
                プライバシーポリシー
              </Link>
              に同意したものとみなされます。
            </p>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-stone-500 hover:text-[#e67e22] text-sm transition-colors"
          >
            <FaArrowLeft className="text-xs" />
            戻る
          </button>
        </div>
      </div>
    </main>
  );
}
