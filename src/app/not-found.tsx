"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaCompass, FaMap } from 'react-icons/fa6';
import { localizeHref, resolveLanguageFromPathname } from '@/lib/i18n/navigation';

export default function NotFound() {
  const pathname = usePathname();
  const language = resolveLanguageFromPathname(pathname);
  const ui =
    language === "ja"
      ? {
          title: "ページが見つかりません",
          description:
            "お探しのページは、削除されたか、URLが変更された可能性があります。",
          sub: "道に迷うのも旅の醍醐味ですが...\nこのページは本当に存在しないようです。",
          back: "トップページに戻る",
        }
      : {
          title: "Page not found",
          description:
            "The page you are looking for may have been removed or moved to a different URL.",
          sub: "Getting lost can be part of the journey,\nbut this page really does not exist.",
          back: "Back to home",
        };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 text-center">

      {/* Icon or decorative element */}
      <div className="mb-6 text-primary/20 animate-pulse">
         <FaCompass size={120} />
      </div>

      <h1 className="text-6xl md:text-8xl font-serif font-bold text-primary mb-4">
        404
      </h1>

      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
        {ui.title}
      </h2>

      <div className="max-w-md mx-auto space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          {ui.description}
        </p>

        <p className="font-hand text-lg text-secondary">
          {ui.sub.split("\n")[0]}<br/>
          {ui.sub.split("\n")[1]}
        </p>

        <div className="pt-4">
          <Link
            href={localizeHref("/", language)}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <FaMap className="text-sm" />
            {ui.back}
          </Link>
        </div>
      </div>
    </div>
  );
}
