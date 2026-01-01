'use client';

import React, { useActionState } from 'react';
import { FaEnvelope } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { sendContactEmail, ContactState } from '@/app/actions/contact';

const initialState: ContactState = {
  success: false,
  message: '',
};

export default function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    sendContactEmail,
    initialState
  );

  return (
    <section className="bg-white p-8 rounded-xl shadow-sm border border-stone-100">
      <h2 className="text-xl font-bold text-[#2c2c2c] mb-6 font-serif flex items-center gap-2">
        <FaEnvelope className="text-[#e67e22]" />
        <span>お問い合わせフォーム</span>
      </h2>

      {state.success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl text-center"
        >
          <p className="font-bold text-lg mb-2">送信完了</p>
          <p>{state.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-green-700 underline text-sm hover:text-green-900"
          >
            新しいお問い合わせを送る
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
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full p-4 rounded-xl border-2 border-stone-200 bg-white focus:border-[#e67e22] focus:outline-none transition-colors font-sans"
              placeholder="山田 太郎"
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
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full p-4 rounded-xl border-2 border-stone-200 bg-white focus:border-[#e67e22] focus:outline-none transition-colors font-sans"
              placeholder="taro@example.com"
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
              件名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              required
              className="w-full p-4 rounded-xl border-2 border-stone-200 bg-white focus:border-[#e67e22] focus:outline-none transition-colors font-sans"
              placeholder="機能追加のリクエストについて"
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
              お問い合わせ内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={6}
              className="w-full p-4 rounded-xl border-2 border-stone-200 bg-white focus:border-[#e67e22] focus:outline-none transition-colors font-sans resize-none"
              placeholder="具体的な内容をご記入ください"
            />
            {state.errors?.message && (
              <p className="text-red-500 text-xs mt-1">
                {state.errors.message[0]}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full p-4 bg-[#e67e22] text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                送信中...
              </>
            ) : (
              '送信する'
            )}
          </button>
          <p className="text-xs text-stone-500 text-center mt-4">
            ※ 個人開発のため、返信にお時間をいただく場合がございます。
          </p>
        </form>
      )}
    </section>
  );
}
