'use client';

import React, { useActionState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaStamp } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { sendContactEmail, ContactState } from '@/app/actions/contact';
import { localizeHref, resolveLanguageFromPathname } from '@/lib/i18n/navigation';

const initialState: ContactState = {
  success: false,
  message: '',
};

export default function ContactForm() {
  const pathname = usePathname();
  const language = resolveLanguageFromPathname(pathname);
  const ui =
    language === "ja"
      ? {
          contactJa: "お問い合わせ",
          sent: "送信完了",
          newInquiry: "新しいお問い合わせを送る",
          name: "お名前",
          email: "メールアドレス",
          subject: "件名",
          subjectPlaceholder: "機能追加のリクエストについて",
          message: "お問い合わせ内容",
          messagePlaceholder: "具体的な内容をご記入ください",
          agree: "に同意します",
          privacy: "プライバシーポリシー",
          terms: "利用規約",
          aiPolicy: "AIポリシー",
          sending: "送信中...",
          submit: "送信する",
          note: "※ 個人開発のため、返信にお時間をいただく場合がございます。",
        }
      : {
          contactJa: "Contact",
          sent: "Sent",
          newInquiry: "Send another inquiry",
          name: "Name",
          email: "Email",
          subject: "Subject",
          subjectPlaceholder: "About a feature request",
          message: "Message",
          messagePlaceholder: "Please enter details",
          agree: "I agree",
          privacy: "Privacy Policy",
          terms: "Terms of Service",
          aiPolicy: "AI Policy",
          sending: "Sending...",
          submit: "Send",
          note: "As this is an indie project, replies may take some time.",
        };

  const [state, formAction, isPending] = useActionState(
    sendContactEmail,
    initialState
  );

  return (
    <section className="relative bg-[#fffdfa] p-8 md:p-12 rounded-lg shadow-lg border border-stone-200 overflow-hidden max-w-4xl mx-auto">
      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-50 pointer-events-none mix-blend-multiply" />

      {/* Stamp & Postmark (Desktop) */}
      <div className="absolute top-6 right-8 hidden md:block pointer-events-none opacity-80 rotate-6">
        <div className="w-24 h-28 border-4 border-double border-stone-300 p-2 flex items-center justify-center bg-stone-50 shadow-sm relative z-10">
          <div className="w-full h-full border border-stone-200 flex items-center justify-center">
            <FaStamp className="text-4xl text-stone-300" />
          </div>
        </div>
        <div className="absolute -left-12 top-6 w-32 h-32 rounded-full border-2 border-stone-300/50 flex items-center justify-center -rotate-12 z-0">
          <div className="text-[10px] font-mono text-stone-300 uppercase tracking-widest text-center">
            Tabidea
            <br />
            Post Service
            <br />
            {new Date().getFullYear()}
          </div>
        </div>
        {/* Postcard Lines */}
        <div className="absolute top-36 right-4 w-48 space-y-4 opacity-30">
          <div className="h-px bg-stone-400 w-full" />
          <div className="h-px bg-stone-400 w-full" />
          <div className="h-px bg-stone-400 w-full" />
        </div>
      </div>

      <div className="relative z-10">
        <h2 className="text-3xl font-bold text-[#2c2c2c] mb-8 font-hand flex items-center gap-3">
          <span className="border-b-4 border-[#e67e22]/20 pb-1">Contact</span>
          <span className="text-base font-serif text-stone-500 font-normal mt-1">
            {ui.contactJa}
          </span>
        </h2>

        {state.success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl text-center"
        >
          <p className="font-bold text-lg mb-2">{ui.sent}</p>
          <p>{state.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-green-700 underline text-sm hover:text-green-900"
          >
            {ui.newInquiry}
          </button>
        </motion.div>
      ) : (
        <form action={formAction} className="space-y-6">
          {state.message && !state.success && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm">
              {state.message}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-bold text-stone-700 mb-2 font-serif"
            >
              {ui.name} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full p-4 rounded-xl border-2 border-stone-200 bg-white focus:border-[#e67e22] focus:outline-none transition-colors font-sans"
              placeholder="たびであ"
            />
            {state.errors?.name && (
              <p className="text-red-500 text-xs mt-1">
                {state.errors.name[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-bold text-stone-700 mb-2 font-serif"
            >
              {ui.email} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full p-4 rounded-xl border-2 border-stone-200 bg-white focus:border-[#e67e22] focus:outline-none transition-colors font-sans"
              placeholder="tabidea@example.com"
            />
            {state.errors?.email && (
              <p className="text-red-500 text-xs mt-1">
                {state.errors.email[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-bold text-stone-700 mb-2 font-serif"
            >
              {ui.subject} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              required
              className="w-full p-4 rounded-xl border-2 border-stone-200 bg-white focus:border-[#e67e22] focus:outline-none transition-colors font-sans"
              placeholder={ui.subjectPlaceholder}
            />
            {state.errors?.subject && (
              <p className="text-red-500 text-xs mt-1">
                {state.errors.subject[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-sm font-bold text-stone-700 mb-2 font-serif"
            >
              {ui.message} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={6}
              className="w-full p-4 rounded-xl border-2 border-stone-200 bg-white focus:border-[#e67e22] focus:outline-none transition-colors font-sans resize-none"
              placeholder={ui.messagePlaceholder}
            />
            {state.errors?.message && (
              <p className="text-red-500 text-xs mt-1">
                {state.errors.message[0]}
              </p>
            )}
          </div>

          <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex items-center h-5">
              <input
                id="agreement"
                name="agreement"
                type="checkbox"
                required
                className="w-5 h-5 text-[#e67e22] border-stone-300 rounded focus:ring-[#e67e22] focus:ring-2 cursor-pointer"
              />
            </div>
            <label htmlFor="agreement" className="text-sm text-stone-700 cursor-pointer select-none">
              <Link href={localizeHref("/privacy", language)} className="text-[#e67e22] hover:underline" target="_blank">{ui.privacy}</Link>
              、
              <Link href={localizeHref("/terms", language)} className="text-[#e67e22] hover:underline" target="_blank">{ui.terms}</Link>
              、及び
              <Link href={localizeHref("/ai-policy", language)} className="text-[#e67e22] hover:underline" target="_blank">{ui.aiPolicy}</Link>
              {ui.agree} <span className="text-red-500">*</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full p-4 bg-[#e67e22] text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {ui.sending}
              </>
            ) : (
              ui.submit
            )}
          </button>
          <p className="text-xs text-stone-500 text-center mt-4">
            {ui.note}
          </p>
        </form>
      )}
      </div>
    </section>
  );
}
