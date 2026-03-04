'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaMapMarkerAlt, FaPlane, FaPassport, FaArrowLeft } from 'react-icons/fa';

import { localizeHref, resolveLanguageFromPathname } from '@/lib/i18n/navigation';
import { useAuth } from '@/context/AuthContext';
import type { AuthProvider } from '@/types';

export default function LoginClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const language = resolveLanguageFromPathname(pathname);
  const ui =
    language === "ja"
      ? {
          title: "ログイン",
          subtitle1: "あなたの旅の思い出を",
          subtitle2: "大切に保存しましょう",
          signinError: "ログインに失敗しました。もう一度お試しください。",
          restore: "ログイン後、入力内容が復元されます。",
          loginWithGoogle: "Googleでログイン",
          benefitsTitle: "ログインするとできること",
          savePlans: "プランの保存",
          sharePlans: "プランの共有",
          viewAnytime: "いつでも閲覧",
          multiDevice: "複数デバイス対応",
          termsPrefix: "ログインすることで、",
          terms: "利用規約",
          and: "と",
          privacy: "プライバシーポリシー",
          agreeSuffix: "に同意したものとみなされます。",
          back: "戻る",
        }
      : {
          title: "Log in",
          subtitle1: "Keep your travel memories",
          subtitle2: "saved in one place",
          signinError: "Failed to log in. Please try again.",
          restore: "Your input will be restored after login.",
          loginWithGoogle: "Continue with Google",
          benefitsTitle: "With an account you can",
          savePlans: "Save plans",
          sharePlans: "Share plans",
          viewAnytime: "View anytime",
          multiDevice: "Use across devices",
          termsPrefix: "By logging in, you agree to the ",
          terms: "Terms of Service",
          and: " and ",
          privacy: "Privacy Policy",
          agreeSuffix: ".",
          back: "Back",
        };
  const { signIn, isLoading, isAuthenticated } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirect') || localizeHref('/my-plans', language);
  const restore = searchParams.get('restore');
  const modal = searchParams.get('modal');
  const autoSave = searchParams.get('autoSave');

  // Redirect if already authenticated
  if (isAuthenticated && !isLoading) {
    router.push(redirectTo);
    return null;
  }

  const handleSignIn = async (provider: AuthProvider) => {
    setIsSigningIn(true);
    setError(null);

    try {
      // Build callback URL with restoration parameters
      const queryParams: Record<string, string> = {
        redirect: redirectTo,
      };
      if (restore) queryParams.restore = restore;
      if (modal) queryParams.modal = modal;
      if (autoSave) queryParams.autoSave = autoSave;

      await signIn(provider, { queryParams });
    } catch (err) {
      console.error('Sign in error:', err);
      setError(ui.signinError);
      setIsSigningIn(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fcfbf9] px-4 pt-24 pb-12">
      {/* Decorative elements */}
      <div className="fixed top-32 left-10 text-[#e67e22]/10 rotate-12 hidden lg:block">
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
              {ui.title}
            </h1>
            <p className="text-stone-500 text-sm font-hand">
              {ui.subtitle1}
              <br />
              {ui.subtitle2}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-dashed border-red-300 rounded-xl">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          {/* 復元予定の通知 */}
          {restore === 'true' && (
            <div className="mb-6 p-4 bg-blue-50 border border-dashed border-blue-300 rounded-xl">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-blue-700">
                  {ui.restore}
                </p>
              </div>
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
                {ui.loginWithGoogle}
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
              {ui.benefitsTitle}
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs text-stone-600">
              <div className="flex items-center gap-2 bg-[#e67e22]/5 p-2 rounded-lg">
                <span className="text-[#e67e22]">✓</span>
                {ui.savePlans}
              </div>
              <div className="flex items-center gap-2 bg-[#27ae60]/5 p-2 rounded-lg">
                <span className="text-[#27ae60]">✓</span>
                {ui.sharePlans}
              </div>
              <div className="flex items-center gap-2 bg-[#e67e22]/5 p-2 rounded-lg">
                <span className="text-[#e67e22]">✓</span>
                {ui.viewAnytime}
              </div>
              <div className="flex items-center gap-2 bg-[#27ae60]/5 p-2 rounded-lg">
                <span className="text-[#27ae60]">✓</span>
                {ui.multiDevice}
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="mt-6 pt-4 border-t border-dashed border-stone-200">
            <p className="text-xs text-stone-400 text-center">
              {ui.termsPrefix}
              <Link href={localizeHref("/terms", language)} className="text-[#e67e22] hover:underline">
                {ui.terms}
              </Link>
              {ui.and}
              <Link href={localizeHref("/privacy", language)} className="text-[#e67e22] hover:underline">
                {ui.privacy}
              </Link>
              {ui.agreeSuffix}
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
            {ui.back}
          </button>
        </div>
      </div>
    </main>
  );
}
