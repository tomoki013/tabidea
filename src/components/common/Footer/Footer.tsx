"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FaGithub } from "react-icons/fa";
import { localizeHref, resolveLanguageFromPathname } from "@/lib/i18n/navigation";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { Stamp, HandwrittenText, Tape } from "@/components/ui/journal";

/**
 * フッターコンポーネント
 * サイト全体で使用される共通フッター
 */
export default function Footer() {
  const pathname = usePathname();
  const language = resolveLanguageFromPathname(pathname);
  const t = useTranslations("footer");

  return (
    <footer className="w-full relative pt-20 pb-16 px-4 overflow-hidden">
      {/* Background with texture */}
      <div className="absolute inset-0 bg-[#f7f5f0] border-t-8 border-double border-stone-200/50" />
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

      {/* Decorative Tape */}
      <Tape color="blue" position="top-center" className="opacity-70 rotate-1" />

      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 relative z-10">
        {/* Brand */}
        <div className="space-y-6 col-span-2 md:col-span-1 flex flex-col items-start">
          <Link href={localizeHref("/", language)} className="group">
             <div className="relative inline-block transform -rotate-2 group-hover:rotate-0 transition-transform duration-300">
               <Stamp color="black" size="md" className="w-20 h-20 text-xs border-4 bg-white/50 backdrop-blur-sm">
                  <div className="flex flex-col items-center leading-none">
                    <span>TABI</span>
                    <span>DEA</span>
                  </div>
               </Stamp>
             </div>
          </Link>
          <HandwrittenText className="text-stone-600 text-sm leading-relaxed max-w-xs">
            {t("taglineLine1")}<br/>{t("taglineLine2")}
            <br />
            <span className="text-xs opacity-60 block mt-2">{t("supportedBy")}</span>
          </HandwrittenText>
          <LanguageSwitcher />
          <div className="flex gap-4 pt-2">
            <a
              href="https://github.com/tomoki013/ai-travel-planner"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-800 transition-colors transform hover:scale-110 duration-300"
            >
              <FaGithub size={24} />
            </a>
          </div>
        </div>

        {/* Links Sections */}
        <FooterSection title={t("about")}>
          <FooterLink href={localizeHref("/about", language)}>{t("aboutTabidea")}</FooterLink>
          <FooterLink href={localizeHref("/features", language)}>{t("features")}</FooterLink>
          <FooterLink href={localizeHref("/updates", language)}>{t("updates")}</FooterLink>
          <FooterLink href={localizeHref("/pricing", language)}>{t("pricingPlan")}</FooterLink>
        </FooterSection>

        <FooterSection title={t("explore")}>
          <FooterLink href={localizeHref("/shiori", language)}>{t("shiori")}</FooterLink>
          <FooterLink href={localizeHref("/samples", language)}>{t("samples")}</FooterLink>
          <FooterLink href={localizeHref("/blog", language)}>{t("blog")}</FooterLink>
          <FooterLink href={localizeHref("/travel-info", language)}>{t("travelInfo")}</FooterLink>
        </FooterSection>

        <FooterSection title={t("help")}>
          <FooterLink href={localizeHref("/faq", language)}>{t("faq")}</FooterLink>
          <FooterLink href={localizeHref("/contact", language)}>{t("contact")}</FooterLink>
        </FooterSection>

        {/* Legal - Keep clean but integrated */}
        <div className="space-y-4">
          <h4 className="font-bold text-stone-800 font-serif border-b-2 border-stone-200/50 inline-block pb-1">{t("legal")}</h4>
          <ul className="space-y-2 text-sm text-stone-500 font-sans">
            <li><Link href={localizeHref("/terms", language)} className="hover:text-primary transition-colors hover:underline">{t("terms")}</Link></li>
            <li><Link href={localizeHref("/privacy", language)} className="hover:text-primary transition-colors hover:underline">{t("privacy")}</Link></li>
            <li><Link href={localizeHref("/cookie-policy", language)} className="hover:text-primary transition-colors hover:underline">{t("cookiePolicy")}</Link></li>
            <li><Link href={localizeHref("/ai-policy", language)} className="hover:text-primary transition-colors hover:underline">{t("aiPolicy")}</Link></li>
            <li><Link href={localizeHref("/specified", language)} className="hover:text-primary transition-colors hover:underline">{t("specified")}</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-stone-300 border-dashed text-center text-xs text-stone-400 font-mono relative z-10">
        <p>{t("copyright")}</p>
      </div>
    </footer>
  );
}

function FooterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h4 className="font-bold text-stone-800 font-serif border-b-2 border-stone-200/50 inline-block pb-1">{title}</h4>
      <ul className="space-y-2 text-sm text-stone-600 font-hand">
        {children}
      </ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="hover:text-primary transition-colors decoration-dashed hover:underline block hover:translate-x-1 duration-200"
      >
        {children}
      </Link>
    </li>
  );
}
