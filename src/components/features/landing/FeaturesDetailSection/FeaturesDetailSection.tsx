"use client";

import { motion } from "framer-motion";
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

const features = [
  {
    icon: FaRobot,
    title: "AIが旅行プランを自動生成",
    description:
      "質問に答えるだけで、AIがあなたにぴったりの旅行プランを作成します。目的地や期間、予算などの情報をもとに、最適な観光スポットや移動手段を提案。",
    details: [
      "実際の旅行体験データをもとに学習したAIが提案",
      "人気スポットから隠れた名所まで幅広くカバー",
      // "季節やイベント情報も考慮したプラン作成"
    ],
  },
  {
    icon: FaMapMarkedAlt,
    title: "詳細な観光スポット情報",
    description:
      "各スポットには詳しい説明と訪問理由などが含まれています。事前に場所の魅力を知ることで、より楽しい旅行が実現します。",
    details: [
      "観光スポットの特徴や見どころを詳しく解説",
      // "推奨される滞在時間と訪問タイミング",
      // "スポット間の移動手段と所要時間",
    ],
  },
  {
    icon: FaEdit,
    title: "自由にカスタマイズ可能",
    description:
      "生成されたプランは出発点です。気に入らないスポットの変更や、新しい場所の追加など、あなた好みにアレンジできます。",
    details: [
      // "日程の並び替えや時間の調整が簡単",
      "気に入らない予定は削除可",
      "予算に応じてプランを最適化",
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
    title: "日程に合わせた最適化",
    description:
      "1日の短い旅行から数週間の長期旅行まで、あなたの日程に合わせたプランを作成。効率的なルートで時間を最大限に活用します。",
    details: [
      "日帰りから長期旅行まで柔軟に対応",
      "移動時間を考慮した現実的なスケジュール",
      "余裕のある時間配分で疲れない旅を実現",
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
    title: "予算に応じたプラン作成",
    description:
      "旅行の予算を設定すれば、その範囲内で最大限楽しめるプランを提案。無理のない範囲で充実した旅行を実現します。",
    details: [
      // "宿泊費や交通費を含めた総合的な予算管理",
      "コストパフォーマンスの高いスポット選定",
      // "節約ポイントも合わせて提案",
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
      "アカウントを作成すれば、作成したプランを無期限に保存可能。PCで作ったプランをスマホで確認したり、過去の旅行を振り返ることも簡単です。",
    details: [
      "プランの無期限保存・編集",
      "PC・スマホ・タブレットでの同期",
      "過去の旅行履歴の管理",
    ],
  },
];

export default function FeaturesDetailSection() {
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
            充実の機能
          </h2>
          <p className="text-muted-foreground font-hand text-lg">
            あなたの旅行計画を強力にサポートします
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {features.map((feature, index) => (
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
