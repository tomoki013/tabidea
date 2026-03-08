"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { FaArrowRight, FaHeart, FaUserCircle } from "react-icons/fa";
import { localizePath } from "@/lib/i18n/locales";
import type { PublicShioriListItem } from "@/types/plans";

const ALL_THEMES = [
  'gourmet', 'cafeHopping', 'historyCulture', 'natureScenery', 
  'spectacularViews', 'cityWalk', 'resort', 'relax', 'hiddenSpots', 
  'shopping', 'art', 'architecture', 'nightlife', 'experienceActivity', 
  'localExperience', 'onsenSauna', 'wellness', 'photogenic', 
  'powerSpots', 'seasonalEvents', 'adventure', 'oshikatsu'
];

function getFallbackTags(destination: string | null): string[] {
  if (!destination) return ['relax', 'cityWalk'];
  let hash = 0;
  for (let i = 0; i < destination.length; i++) {
    hash = destination.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx1 = Math.abs(hash) % ALL_THEMES.length;
  const idx2 = Math.abs(hash + 7) % ALL_THEMES.length;
  const tag1 = ALL_THEMES[idx1];
  const tag2 = ALL_THEMES[idx2];
  return tag1 === tag2 ? [tag1] : [tag1, tag2];
}

export default function CommunitySection({ plans = [] }: { plans?: PublicShioriListItem[] }) {
  const t = useTranslations("components.features.landing.v2.communitySection");
  const tTheme = useTranslations("components.features.shiori.conditionsCard.themeOptions");
  const tBudget = useTranslations("components.features.shiori.conditionsCard.budgetOptions");
  const locale = useLocale() as "en" | "ja";

  return (
    <section className="w-full py-24 px-4 bg-stone-900 text-stone-100 relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-stone-800 to-transparent opacity-50 -z-10" />

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 px-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <span className="text-primary font-bold tracking-widest text-sm uppercase">{t("badge")}</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight">
              {t("titleLine1")}<br/>
              {t("titleLine2")}
            </h2>
            <p className="text-stone-400 max-w-lg">
              {t("leadLine1")}<br/>
              {t("leadLine2")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Link
              href={localizePath("/shiori", locale)}
              className="inline-flex items-center gap-2 text-white border-b border-primary pb-1 hover:text-primary transition-colors group"
            >
              <span>{t("viewMore")}</span>
              <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Horizontal Scroll Container */}
        <div className="relative">
          <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory px-4 scrollbar-hide -mx-4 md:mx-0 mask-image-linear-gradient-to-r">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="snap-center shrink-0 w-[280px] md:w-[320px]"
              >
                <Link href={localizePath(`/shiori/${plan.slug}`, locale)}>
                  <div className="group relative h-full bg-stone-800 rounded-2xl overflow-hidden hover:-translate-y-2 transition-transform duration-300 shadow-lg border border-stone-700 flex flex-col">
                    {/* Image */}
                    <div className="relative h-48 w-full overflow-hidden shrink-0">
                      {plan.thumbnailUrl ? (
                        <img
                          src={plan.thumbnailUrl}
                          alt={plan.destination ?? ""}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-stone-700 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                          <FaUserCircle className="text-4xl text-stone-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white text-sm">
                        <FaHeart className="text-pink-500" />
                        <span>{plan.likesCount ?? 0}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1 gap-3">
                      <div className="flex gap-2 flex-wrap">
                        {(plan.conditionsSummary?.theme?.length
                          ? plan.conditionsSummary.theme.slice(0, 2)
                          : getFallbackTags(plan.destination)
                        ).map((tag: string) => {
                          // Normalize tag to handle potential AI capitalization or spaces
                          const normalizedTag = tag.trim();
                          // Try to translate, fallback to original tag if not found
                          const translatedTag = tTheme(normalizedTag);
                          return (
                            <span key={tag} className="text-xs text-stone-400 bg-stone-700/50 px-2 py-1 rounded-md">
                              #{translatedTag}
                            </span>
                          );
                        })}
                      </div>
                      <h3 className="font-bold text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {plan.destination}
                      </h3>
                      <div className="flex justify-between items-center pt-2 mt-auto border-t border-stone-700 text-sm text-stone-400">
                        <span>{plan.durationDays ? `${plan.durationDays}日間` : ''}</span>
                        <span>
                          {plan.conditionsSummary?.budget && tBudget.has(plan.conditionsSummary.budget)
                            ? tBudget(plan.conditionsSummary.budget)
                            : plan.conditionsSummary?.budget ?? ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* "View More" Card */}
            <div className="snap-center shrink-0 w-[200px] flex items-center justify-center">
               <Link href={localizePath("/shiori", locale)} className="flex flex-col items-center gap-4 text-stone-400 hover:text-white transition-colors group p-8 rounded-2xl border-2 border-dashed border-stone-700 hover:border-primary">
                  <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-primary transition-colors">
                     <FaArrowRight className="text-xl" />
                  </div>
                  <span className="font-bold">{t("viewAllPlans")}</span>
               </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
