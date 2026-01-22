"use client";

import { motion } from "framer-motion";
import { FaArrowRight } from "react-icons/fa";
import StartPlanningButton from "@/components/common/StartPlanningButton";

const steps = [
  {
    number: "1",
    title: "行き先を選ぶ",
    description:
      "まずは、行きたい場所を入力します。具体的な都市名でも、「暖かい場所」「自然が豊かなところ」といった漠然としたイメージでも大丈夫です。",
    tips: [
      "複数の候補地を入力することも可能",
      "地域や国で指定してもOK",
      "「おまかせ」を選んでAIにおすすめしてもらうこともできます",
    ],
  },
  {
    number: "2",
    title: "旅行の詳細を設定",
    description:
      "日程、予算、同行者、旅のテーマなど、旅行の詳細情報を入力していきます。対話形式で進むので、まるで友達と話しているような感覚です。",
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
      "入力した情報をもとに、AIが旅行プランを作成します。観光スポット、移動手段、所要時間などが含まれた、実行可能なプランが数秒で完成します。",
    tips: [
      "生成には10〜60秒程度かかります",
      // "複数の候補プランから選べる場合も",
      // "天候や季節も考慮されています",
    ],
  },
  {
    number: "4",
    title: "プランをカスタマイズ",
    description:
      "生成されたプランを自由に編集できます。スポットの追加・削除、順番の入れ替え、時間の調整など、完璧な旅行プランに仕上げましょう。",
    tips: [
      "気になるスポットをタップして詳細を確認",
      "不要なスポットは削除して新しいものを追加",
      "移動時間や滞在時間も調整可能",
    ],
  },
  {
    number: "5",
    title: "プランを保存・共有",
    description:
      "完成したプランは保存して、いつでも見返すことができます。また、旅行仲間とプランを共有することも可能です。",
    tips: [
      "※将来的な変更で見れなくなる可能性があります",
      // "PDFでダウンロードすることも可能",
      // "修正したい場合はいつでも編集できます",
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
];

export default function HowToUseSection() {
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
              使い方ガイド
            </h2>
            <p className="text-muted-foreground font-hand text-lg">
              5つのステップで、理想の旅行プランが完成します
            </p>
          </motion.div>

          <div className="space-y-8">
            {steps.map((step, index) => (
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
                      💡 ポイント
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
              上手な使い方のコツ
            </h2>
            <p className="text-muted-foreground font-hand text-lg">
              より良いプランを作成するためのヒント
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {usageTips.map((tip, index) => (
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
            さあ、旅の計画を始めましょう
          </h3>
          <p className="text-muted-foreground font-hand text-lg">
            無料で今すぐ使い始められます
          </p>
          <StartPlanningButton
            className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl group"
          >
            <span>旅行プランを作成する</span>
            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </StartPlanningButton>
        </motion.div>
      </div>
    </section>
  );
}
