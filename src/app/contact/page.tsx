import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FaEnvelope } from "react-icons/fa";

export const metadata: Metadata = {
  title: "お問い合わせ - AI Travel Planner",
  description: "AI Travel Plannerに関するお問い合わせ、機能リクエスト、不具合報告はこちらから。",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen p-8 sm:p-20 font-sans bg-[#fcfbf9]">
      <main className="max-w-3xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2c2c2c] mb-4">
            Contact
          </h1>
          <p className="text-stone-600 font-hand text-lg">
            お問い合わせ・ご意見・ご感想
          </p>
        </header>

        <div className="space-y-8">
          <section className="bg-white p-8 rounded-xl shadow-sm border border-stone-100">
            <h2 className="text-xl font-bold text-[#2c2c2c] mb-4 font-serif flex items-center gap-2">
              <FaEnvelope className="text-[#e67e22]" />
              <span>お問い合わせについて</span>
            </h2>
            <p className="text-stone-600 leading-relaxed mb-6">
              AI Travel Plannerをご利用いただきありがとうございます。<br />
              機能の不具合報告、新しい機能のリクエスト、その他サービスに関するお問い合わせは、以下の方法で受け付けております。
            </p>
            <p className="text-stone-500 text-sm mb-4">
              ※ 個人開発のため、返信にお時間をいただく場合がございます。あらかじめご了承ください。
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GitHub Issues */}
            <a
              href="https://github.com/tomoki013/ai-travel-planner/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="block group relative overflow-hidden rounded-xl border border-stone-200 bg-white p-6 transition-all hover:shadow-md hover:border-[#e67e22]/50"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-stone-100 rounded-full text-stone-700 group-hover:bg-[#e67e22] group-hover:text-white transition-colors">
                  <FaGithub size={24} />
                </div>
                <h3 className="font-bold text-lg text-[#2c2c2c] font-serif">不具合・要望</h3>
              </div>
              <p className="text-stone-600 text-sm leading-relaxed">
                システムのバグ報告や、具体的な機能追加のリクエストはGitHub Issuesにて受け付けています。開発の進捗も確認できます。
              </p>
            </a>

            {/* X (Twitter) DM */}
            {/* <a
              href="https://x.com/tomoki013"
              target="_blank"
              rel="noopener noreferrer"
              className="block group relative overflow-hidden rounded-xl border border-stone-200 bg-white p-6 transition-all hover:shadow-md hover:border-[#e67e22]/50"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-stone-100 rounded-full text-stone-700 group-hover:bg-black group-hover:text-white transition-colors">
                  <FaXTwitter size={24} />
                </div>
                <h3 className="font-bold text-lg text-[#2c2c2c] font-serif">その他のお問い合わせ</h3>
              </div>
              <p className="text-stone-600 text-sm leading-relaxed">
                サービスへのご感想、取材のご依頼、その他一般的なお問い合わせは、X (Twitter) のDMにてお気軽にご連絡ください。
              </p>
            </a> */}
          </div>

          <div className="text-center mt-12">
            <Link href="/" className="inline-block text-[#e67e22] font-bold hover:underline decoration-dashed underline-offset-4">
              トップページに戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
