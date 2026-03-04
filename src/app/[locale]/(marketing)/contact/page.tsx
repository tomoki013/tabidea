import type { Metadata } from "next";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import ContactForm from "@/components/ContactForm";
import { FaX } from "react-icons/fa6";
import { getRequestLanguage } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/locales";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  return language === "ja"
    ? {
        title: "お問い合わせ",
        description:
          "Tabideaに関するお問い合わせ、機能リクエスト、不具合報告はこちらから。",
      }
    : {
        title: "Contact",
        description:
          "Contact Tabidea for inquiries, feature requests, and bug reports.",
      };
}

export default async function ContactPage() {
  const language = await getRequestLanguage();
  return (
    <div className="min-h-screen pt-32 pb-20 px-8 sm:px-20 font-sans">
      <main className="max-w-3xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2c2c2c] mb-4">
            Contact
          </h1>
          <p className="text-stone-600 font-hand text-lg">
            {language === "ja" ? "お問い合わせ・ご意見・ご感想" : "Inquiries, feedback, and requests"}
          </p>
        </header>

        <div className="space-y-12">
          {/* Contact Form Section */}
          <ContactForm />

          <section className="text-center text-sm text-stone-500 space-y-2">
            <p>{language === "ja" ? "お問い合わせ前に、以下のポリシーもご確認ください。" : "Before contacting us, please review these policies."}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href={localizePath("/terms", language)} className="underline hover:text-[#e67e22]">{language === "ja" ? "利用規約" : "Terms"}</Link>
              <span>|</span>
              <Link href={localizePath("/privacy", language)} className="underline hover:text-[#e67e22]">{language === "ja" ? "プライバシーポリシー" : "Privacy Policy"}</Link>
              <span>|</span>
              <Link href={localizePath("/ai-policy", language)} className="underline hover:text-[#e67e22]">{language === "ja" ? "AIポリシー" : "AI Policy"}</Link>
              <span>|</span>
              <Link href={localizePath("/cookie-policy", language)} className="underline hover:text-[#e67e22]">{language === "ja" ? "クッキーポリシー" : "Cookie Policy"}</Link>
            </div>
          </section>

          {/* Other Links Section */}
          <section>
            <h3 className="text-lg font-bold text-stone-700 mb-4 font-serif text-center">
              {language === "ja" ? "その他のご連絡方法" : "Other ways to contact"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GitHub Issues */}
              <Link
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
                    {language === "ja" ? "不具合・要望 (GitHub)" : "Bugs & requests (GitHub)"}
                  </h3>
                </div>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {language === "ja" ? "GitHub Issuesもご利用いただけます。" : "You can also use GitHub Issues."}
                </p>
              </Link>

              {/* X (Twitter) DM */}
              <Link
                href="https://x.com/tomokichi178694"
                target="_blank"
                rel="noopener noreferrer"
                className="block group relative overflow-hidden rounded-xl border border-stone-200 bg-white p-6 transition-all hover:shadow-md hover:border-[#e67e22]/50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-stone-100 rounded-full text-stone-700 group-hover:bg-black group-hover:text-white transition-colors">
                    <FaX size={24} />
                  </div>
                  <h3 className="font-bold text-lg text-[#2c2c2c] font-serif">
                    {language === "ja" ? "その他のお問い合わせ" : "General inquiries"}
                  </h3>
                </div>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {language === "ja"
                    ? "サービスへのご感想、取材のご依頼、その他一般的なお問い合わせは、X(Twitter) のDMにてお気軽にご連絡ください。"
                    : "For feedback, interview requests, and general inquiries, feel free to reach out via X (Twitter) DM."}
                </p>
              </Link>

              {/* Placeholder to balance grid if single item on large screens, though CSS handles it automatically, keeping consistent with grid */}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
