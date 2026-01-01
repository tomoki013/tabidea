import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import ContactForm from "@/components/ContactForm";

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

        <div className="space-y-12">
          {/* Contact Form Section */}
          <ContactForm />

          {/* Other Links Section */}
          <section>
             <h3 className="text-lg font-bold text-stone-700 mb-4 font-serif text-center">その他のご連絡方法</h3>
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
                <h3 className="font-bold text-lg text-[#2c2c2c] font-serif">
                  不具合・要望 (GitHub)
                </h3>
              </div>
              <p className="text-stone-600 text-sm leading-relaxed">
                開発者の方はGitHub Issuesもご利用いただけます。
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

            {/* Placeholder to balance grid if single item on large screens, though CSS handles it automatically, keeping consistent with grid */}
            </div>
          </section>

          <div className="text-center mt-12">
            <Link
              href="/"
              className="inline-block text-[#e67e22] font-bold hover:underline decoration-dashed underline-offset-4"
            >
              トップページに戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
