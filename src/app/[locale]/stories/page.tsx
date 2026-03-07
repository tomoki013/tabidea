import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { localizePath } from '@/lib/i18n/locales';
import { getRequestLanguage } from '@/lib/i18n/server';
import { HandwrittenText, Tape, Stamp } from '@/components/ui/journal';
import { FaHardHat, FaArrowLeft } from 'react-icons/fa';

export async function generateMetadata() {
  const t = await getTranslations("pages.stories.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function StoriesComingSoonPage() {
  const language = await getRequestLanguage();
  const t = await getTranslations("pages.stories");

  return (
    <main className="min-h-screen bg-[#fcfbf9] dark:bg-[#2b2019] relative overflow-hidden flex items-center justify-center px-4 py-20">
      {/* Texture Background */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

      <div className="w-full max-w-2xl relative z-10">
        {/* Notebook Card */}
        <div className="relative bg-white dark:bg-[#3b2c22] rounded-md shadow-md border border-stone-200/60 dark:border-[#6e5645]/50 p-8 md:p-12 overflow-hidden transform -rotate-1">
          {/* Tape Effect */}
          <Tape color="blue" position="top-center" className="opacity-80 rotate-2" />
          <Tape color="white" position="bottom-right" className="opacity-60 -rotate-3" />

          {/* Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #d6d3d1 27px, #d6d3d1 28px)',
              backgroundPositionY: '40px'
            }}
          />

          <div className="relative z-10 text-center space-y-8 mt-4">
            <div className="flex justify-center mb-6">
               <Stamp color="red" size="lg" className="w-24 h-24 border-4 rotate-12 bg-white/50 backdrop-blur-sm">
                  <div className="flex flex-col items-center leading-none">
                    <FaHardHat className="text-3xl mb-1 text-orange-600/80" />
                    <span className="text-[10px] font-bold">COMING</span>
                    <span className="text-[10px] font-bold">SOON</span>
                  </div>
               </Stamp>
            </div>

            <div className="space-y-4">
              <HandwrittenText className="text-4xl md:text-5xl font-bold text-stone-800 dark:text-stone-50">
                {t("title")}
              </HandwrittenText>

              <div className="h-px w-32 bg-stone-300 dark:bg-stone-600 mx-auto rounded-full" />

              <p className="text-lg text-stone-600 dark:text-stone-300 font-hand leading-relaxed max-w-lg mx-auto">
                {t("description")}
              </p>

              <p className="text-sm text-stone-500 dark:text-stone-400 font-sans bg-stone-50 dark:bg-[#2b2019] inline-block px-4 py-2 rounded border border-stone-200 dark:border-[#5a4435] border-dashed mt-4">
                {t("message")}
              </p>
            </div>

            <div className="pt-8 flex justify-center">
              <Link
                href={localizePath("/", language)}
                className="group flex items-center gap-2 px-6 py-3 bg-stone-800 hover:bg-stone-700 dark:bg-stone-100 dark:hover:bg-white text-stone-50 dark:text-stone-900 rounded font-hand font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <FaArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
                {t("backHome")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
