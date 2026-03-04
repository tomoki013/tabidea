"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { FaArrowRight } from "react-icons/fa";
import StartPlanningButton from "@/components/common/StartPlanningButton";
import { DEFAULT_LANGUAGE, getLanguageFromPathname } from "@/lib/i18n/locales";

const steps = [
  {
    number: "1",
    title: "行き先を選ぶ",
    description:
      "まずは、行きたい場所を入力します。具体的な都市名はもちろん、複数の候補地を入力して周遊プランを作ることもできます。",
    tips: [
      "複数の候補地を入力することも可能",
      "地域や国で指定してもOK",
      "都市名が未確定でも後から調整できます",
    ],
  },
  {
    number: "2",
    title: "旅行の詳細を設定",
    description:
      "日程、予算、同行者、旅のテーマなど、旅行条件を入力します。入力した条件はプラン生成時にまとめて反映されます。",
    tips: [
      "日程は大まかな期間でも構いません",
      // "予算は総額または1日あたりの金額で設定",
      "「歴史」「グルメ」など興味のあるテーマを選択",
    ],
  },
  {
    number: "3",
    title: "AIがプランを生成",
    description:
      "入力した情報をもとに、AIが旅行プランを作成します。観光スポットや移動の流れを含む旅程案が表示されます。",
    tips: [
      "生成には10〜60秒程度かかります",
      // "複数の候補プランから選べる場合も",
      "費用概算も同時に算出されます",
    ],
  },
  {
    number: "4",
    title: "プランをカスタマイズ",
    description:
      "生成されたプランは再生成やチャット調整で見直せます。希望を追加しながら、旅行スタイルに合う形へ整えられます。",
    tips: [
      "気になるスポットをタップして詳細を確認",
      "必要に応じて再生成して比較",
      "条件を変えて複数案を試すのがおすすめ",
    ],
  },
  {
    number: "5",
    title: "プランを保存・共有",
    description:
      "完成したプランは保存して、いつでも見返せます。アカウント登録（無料）で無期限・無制限保存や端末間同期、PDF出力・カレンダー連携も利用できます。",
    tips: [
      "Googleカレンダー等へのエクスポート",
      "ログインすればPC・スマホで同期",
      "PDFダウンロードでオフラインでも安心",
    ],
  },
];

const stepsEn = [
  {
    number: "1",
    title: "Choose destinations",
    description:
      "Enter where you want to go. You can add multiple candidates for a multi-city plan.",
    tips: [
      "You can add multiple destination candidates",
      "Country or region level input also works",
      "You can adjust details later",
    ],
  },
  {
    number: "2",
    title: "Set travel details",
    description:
      "Provide schedule, budget, companions, and themes. These are reflected in generation.",
    tips: [
      "Approximate duration is fine",
      "Select themes like history or food",
    ],
  },
  {
    number: "3",
    title: "AI generates a plan",
    description:
      "Based on your input, AI creates an itinerary including spots and movement flow.",
    tips: [
      "Generation usually takes 10-60 seconds",
      "Rough cost estimation is included",
    ],
  },
  {
    number: "4",
    title: "Customize your plan",
    description:
      "Refine with regeneration and chat adjustments to match your preferred travel style.",
    tips: [
      "Open spots to check details",
      "Regenerate and compare when needed",
      "Try multiple condition sets",
    ],
  },
  {
    number: "5",
    title: "Save and share",
    description:
      "Save completed plans anytime. With a free account you can sync devices, export PDF, and connect calendars.",
    tips: [
      "Export to Google Calendar and more",
      "Sync across PC and mobile when logged in",
      "Use PDF for offline access",
    ],
  },
];

const usageTips = [
  {
    title: "具体的な希望を伝える",
    description:
      "「美術館に行きたい」「現地の食べ物を楽しみたい」など、具体的な希望を伝えるほど、より精度の高いプランが生成されます。",
  },
  {
    title: "何度でも再生成できる",
    description:
      "生成されたプランが気に入らなければ、何度でも再生成できます。条件を少し変えて、理想のプランを見つけましょう。",
  },
  {
    title: "チャットで微調整",
    description:
      "プラン生成後、AIとチャットで対話しながら細かい調整ができます。「もっと静かな場所がいい」といったリクエストにも対応します。",
  },
  {
    title: "フリーテキストで入力",
    description:
      "「朝はゆっくり過ごしたい」「子供連れなので疲れない行程で」など、フリーテキストで細かい要望を伝えることもできます。",
  },
  {
    title: "一次情報で最終確認",
    description:
      "営業時間・料金・規制など重要事項は、必ず公式サイトなどの一次情報で最終確認してください。",
  },
];

const usageTipsEn = [
  {
    title: "Be specific about preferences",
    description:
      "The more specific your request is, the better AI can tailor the itinerary.",
  },
  {
    title: "Regenerate as many times as you want",
    description:
      "If you do not like the first output, regenerate with small tweaks and compare.",
  },
  {
    title: "Fine-tune with chat",
    description:
      "After generation, adjust details interactively through chat requests.",
  },
  {
    title: "Use free-text requests",
    description:
      "You can provide nuanced needs like slower mornings or kid-friendly pacing.",
  },
  {
    title: "Verify critical facts",
    description:
      "Always verify opening hours, prices, and regulations with official sources.",
  },
];

export default function HowToUseSection() {
  const pathname = usePathname();
  const language = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const currentSteps = language === "ja" ? steps : stepsEn;
  const currentTips = language === "ja" ? usageTips : usageTipsEn;

  return (
    <section className="w-full py-20 px-4 bg-white/50 border-t border-dashed border-gray-200">
      <div className="max-w-6xl mx-auto space-y-20">
        {/* Step by step guide */}
        <div className="space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          className="text-center space-y-4"
        >
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-foreground">
            {language === "ja" ? "使い方ガイド" : "How To Use"}
          </h2>
          <p className="text-muted-foreground font-hand text-lg">
            {language === "ja"
              ? "5つのステップで、理想の旅行プランが完成します"
              : "Build your ideal travel plan in five steps"}
          </p>
        </motion.div>

          <div className="space-y-8">
            {currentSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-6 bg-white rounded-2xl p-6 border-2 border-dashed border-stone-200 hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 text-white flex items-center justify-center font-bold font-serif text-2xl shadow-lg">
                    {step.number}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-2xl font-serif font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                  <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-bold text-primary">
                      {language === "ja" ? "💡 ポイント" : "💡 Tip"}
                    </p>
                    <ul className="space-y-1">
                      {step.tips.map((tip, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-stone-600"
                        >
                          <span className="text-primary mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Usage Tips */}
        <div className="space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          className="text-center space-y-4"
        >
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-foreground">
            {language === "ja" ? "上手な使い方のコツ" : "Tips for Better Results"}
          </h2>
          <p className="text-muted-foreground font-hand text-lg">
            {language === "ja"
              ? "より良いプランを作成するためのヒント"
              : "Hints to generate better itineraries"}
          </p>
        </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentTips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-white to-primary/5 rounded-2xl p-6 border-2 border-dashed border-stone-200"
              >
                <h3 className="text-xl font-serif font-bold text-foreground mb-3">
                  {tip.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {tip.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-6 pt-8"
        >
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
            {language === "ja" ? "さあ、旅の計画を始めましょう" : "Start planning your trip"}
          </h3>
          <p className="text-muted-foreground font-hand text-lg">
            {language === "ja" ? "無料で今すぐ使い始められます" : "Start now for free"}
          </p>
          <StartPlanningButton
            className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl group"
          >
            <span>{language === "ja" ? "旅行プランを作成する" : "Create a travel plan"}</span>
            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </StartPlanningButton>
        </motion.div>
      </div>
    </section>
  );
}
