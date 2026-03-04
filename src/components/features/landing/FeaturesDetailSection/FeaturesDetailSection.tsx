"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  FaRobot,
  FaMapMarkedAlt,
  FaEdit,
  FaGlobeAsia,
  FaCalendarAlt,
  FaUsers,
  FaWallet,
  FaCompass,
  FaCloud,
} from "react-icons/fa";
import { DEFAULT_LANGUAGE, getLanguageFromPathname } from "@/lib/i18n/locales";

const features = [
  {
    icon: FaRobot,
    title: "AIが旅行プランを自動生成",
    description:
      "質問に答えるだけで、AIが旅行プランを作成します。目的地や期間、予算などの条件をもとに、旅程のたたき台を提案します。",
    details: [
      "条件入力から日別プランを生成",
      "目的地・予算・テーマ・同行者を反映",
      "生成後に再調整しやすい構成",
    ],
  },
  {
    icon: FaMapMarkedAlt,
    title: "詳細な観光スポット情報",
    description:
      "各スポットには説明や候補情報を表示します。地図表示や外部リンクとあわせて、計画を具体化できます。",
    details: [
      "スポットごとの見どころを確認可能",
      "必要に応じて地図で場所を確認",
    ],
  },
  {
    icon: FaEdit,
    title: "自由にカスタマイズ可能",
    description:
      "生成されたプランは出発点です。再生成やチャット調整を使って、あなた好みに整えていけます。",
    details: [
      "気になる条件を追加して再生成",
      "不要な予定の見直しが可能",
      "旅の方針に合わせて微調整",
    ],
  },
  {
    icon: FaGlobeAsia,
    title: "世界中の目的地に対応",
    description:
      "国内旅行から海外旅行まで、幅広い目的地に対応。メジャーな観光地はもちろん、まだあまり知られていない穴場スポットも提案します。",
    details: [
      "国内・海外の主要都市を網羅",
      "地域の特性に合わせたプラン作成",
      // "現地の文化や習慣も考慮した提案",
    ],
  },
  {
    icon: FaCalendarAlt,
    title: "日程に合わせた最適化と連携",
    description:
      "日帰りから長期旅行まで、日程に合わせたプランを作成できます。作成後はカレンダー連携で管理しやすくなります。",
    details: [
      "日帰りから長期旅行まで柔軟に対応",
      "Google Calendar / iCal形式でのエクスポート",
      "移動時間を意識したスケジュール提案",
    ],
  },
  {
    icon: FaUsers,
    title: "同行者に合わせたプラン",
    description:
      "一人旅、カップル、家族、友人グループなど、一緒に旅行する人に合わせてプランを調整。それぞれに最適な観光スポットや体験を提案します。",
    details: [
      "同行者の年齢や興味を考慮",
      "グループサイズに応じた最適なアクティビティ",
      "子供連れでも楽しめるファミリー向けスポット",
    ],
  },
  {
    icon: FaWallet,
    title: "予算管理とコスト概算",
    description:
      "AIが生成されたプランに基づいて、交通費・宿泊費・食費・観光費などの概算コストを自動計算。予算内でのプランニングをサポートします。",
    details: [
      "プラン全体の概算費用を表示",
      "コストパフォーマンスの高いスポット選定",
      "予算に応じたプランの最適化",
    ],
  },
  {
    icon: FaCompass,
    title: "テーマに合わせた旅行提案",
    description:
      "グルメ、歴史、自然、アート、ショッピングなど、あなたの興味に合わせたテーマで旅行プランを作成。より深い体験ができる旅を提案します。",
    details: [
      "複数のテーマを組み合わせて提案可能",
      "マニアックな専門スポットも網羅",
      "現地ならではの体験を重視",
    ],
  },
  {
    icon: FaCloud,
    title: "アカウント機能でさらに便利に",
    description:
      "アカウントを作成すれば、作成したプランを無制限に保存できます。PCとスマホ間での同期にも対応しています。",
    details: [
      "プランの無期限・無制限保存",
      "PC・スマホ・タブレットでの同期",
      "保存済みプランの再利用が簡単",
    ],
  },
];

const featuresEn = [
  {
    icon: FaRobot,
    title: "AI auto-generates your itinerary",
    description:
      "Answer a few questions and AI drafts an itinerary based on your destination, duration, and budget.",
    details: [
      "Generate day-by-day plans from your inputs",
      "Reflects destination, budget, themes, and companions",
      "Easy to revise after generation",
    ],
  },
  {
    icon: FaMapMarkedAlt,
    title: "Detailed spot information",
    description:
      "Each spot includes practical context and suggested references so you can concretize your plan.",
    details: [
      "Check highlights for each spot",
      "Open maps when needed",
    ],
  },
  {
    icon: FaEdit,
    title: "Flexible customization",
    description:
      "Generated plans are a starting point. Regenerate or adjust via chat to fit your style.",
    details: [
      "Add conditions and regenerate quickly",
      "Remove or revise unnecessary activities",
      "Fine-tune for your travel style",
    ],
  },
  {
    icon: FaGlobeAsia,
    title: "Worldwide destinations",
    description:
      "From domestic trips to overseas travel, Tabidea supports a wide range of destinations.",
    details: [
      "Coverage for major domestic and global cities",
      "Plans adapted to local characteristics",
    ],
  },
  {
    icon: FaCalendarAlt,
    title: "Schedule optimization and exports",
    description:
      "Create plans from day trips to long stays and export to your calendar after generation.",
    details: [
      "Flexible support from one-day to long trips",
      "Export to Google Calendar / iCal",
      "Schedules consider transfer time",
    ],
  },
  {
    icon: FaUsers,
    title: "Companion-aware planning",
    description:
      "Adjust plans for solo trips, couples, families, and groups with suitable experiences.",
    details: [
      "Considers age and interests",
      "Activities adjusted by group size",
      "Family-friendly options included",
    ],
  },
  {
    icon: FaWallet,
    title: "Budget and cost estimates",
    description:
      "AI estimates transport, accommodation, meals, and activity costs from your generated plan.",
    details: [
      "Displays rough total cost",
      "Suggests cost-effective choices",
      "Supports budget-conscious optimization",
    ],
  },
  {
    icon: FaCompass,
    title: "Theme-based travel ideas",
    description:
      "Plan by themes such as food, history, nature, art, or shopping for deeper experiences.",
    details: [
      "Combine multiple themes",
      "Includes niche, specialized spots",
      "Prioritizes local-only experiences",
    ],
  },
  {
    icon: FaCloud,
    title: "More with an account",
    description:
      "With an account, you can save plans without limits and sync across devices.",
    details: [
      "Unlimited plan saves",
      "Sync across PC, smartphone, and tablet",
      "Quick reuse of saved plans",
    ],
  },
];

export default function FeaturesDetailSection() {
  const pathname = usePathname();
  const language = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const currentFeatures = language === "ja" ? features : featuresEn;

  return (
    <section className="w-full py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-foreground">
            {language === "ja" ? "充実の機能" : "Powerful Features"}
          </h2>
          <p className="text-muted-foreground font-hand text-lg">
            {language === "ja"
              ? "あなたの旅行計画を強力にサポートします"
              : "Everything you need to plan better trips"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {currentFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/50 border-2 border-dashed border-stone-200 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 bg-primary/10 rounded-xl text-primary">
                  <feature.icon size={28} />
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-xl font-serif font-bold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="space-y-2 pt-2">
                    {feature.details.map((detail, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-stone-600"
                      >
                        <span className="text-primary mt-1">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
