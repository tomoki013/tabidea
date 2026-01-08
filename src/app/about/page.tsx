import type { Metadata } from "next";
import Link from "next/link";
import { FaLightbulb, FaHeart, FaRobot } from "react-icons/fa";

export const metadata: Metadata = {
  title: "Tabideaについて - Tabidea",
  description:
    "Tabideaは、AIとともきちの旅行日記の知識を組み合わせて、あなただけの旅行プランを提案するサービスです。",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9]">
      {/* Hero Section */}
      <section className="relative w-full">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center space-y-6">
            <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#2c2c2c] leading-tight">
              Tabideaについて
            </h1>
            <p className="text-xl text-stone-600 font-hand max-w-3xl mx-auto leading-relaxed">
              AIとともきちの旅行日記の知識を組み合わせて、
              <br className="hidden sm:block" />
              あなただけの旅の物語を紡ぎ出すサービスです。
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 pb-16 sm:pb-24">
        <div className="space-y-16">
          {/* What is Tabidea */}
          <section className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-8 sm:p-12 shadow-sm">
            <h2 className="text-3xl font-serif font-bold text-[#e67e22] mb-6">
              Tabideaとは？
            </h2>
            <div className="space-y-4 text-stone-700 leading-relaxed">
              <p>
                Tabidea（タビディア）は、AIの力とリアルな旅行体験をかけ合わせた、新しい旅行プランニングサービスです。
              </p>
              <p>
                「どこに行こうか」「何を見ようか」と悩む時間も旅の醍醐味。
                でも、膨大な情報を調べるのは大変ですよね。
              </p>
              <p>
                Tabideaなら、あなたの希望を伝えるだけで、AIが「ともきちの旅行日記」に蓄積された実際の旅行体験をもとに、
                あなたにぴったりのプランを提案します。
              </p>
            </div>
          </section>

          {/* Key Features */}
          <section>
            <h2 className="text-3xl font-serif font-bold text-[#2c2c2c] mb-8 text-center">
              3つの特徴
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-4 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                  <FaRobot className="text-primary text-2xl" />
                </div>
                <h3 className="text-xl font-serif font-bold text-[#2c2c2c]">
                  AIパワー
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Google Gemini AIを活用し、あなたの希望や旅のスタイルに合わせた最適なプランを瞬時に生成します。
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-4 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                  <FaLightbulb className="text-primary text-2xl" />
                </div>
                <h3 className="text-xl font-serif font-bold text-[#2c2c2c]">
                  実体験ベース
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  「ともきちの旅行日記」の実際の旅行記録をAIが学習。机上の空論ではなく、リアルな体験に基づいた提案を受けられます。
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-4 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                  <FaHeart className="text-primary text-2xl" />
                </div>
                <h3 className="text-xl font-serif font-bold text-[#2c2c2c]">
                  あなたらしさ
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  予算、旅のテーマ、ペース、同行者など、あなたの条件に合わせてカスタマイズされた、世界に一つだけのプランを作成。
                </p>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="bg-gradient-to-br from-stone-50 to-primary/5 rounded-3xl border-2 border-dashed border-stone-200 p-8 sm:p-12">
            <h2 className="text-3xl font-serif font-bold text-[#2c2c2c] mb-8 text-center">
              どうやって使うの？
            </h2>
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-[#2c2c2c]">行き先や条件を入力</h3>
                  <p className="text-stone-600">
                    目的地、日程、予算、旅のテーマなど、あなたの希望を簡単な質問に答えるだけで入力できます。
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-[#2c2c2c]">AIがプランを生成</h3>
                  <p className="text-stone-600">
                    AIが「ともきちの旅行日記」のデータベースから関連情報を抽出し、あなた専用の旅行プランを数秒で作成します。
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-[#2c2c2c]">プランを確認・シェア</h3>
                  <p className="text-stone-600">
                    生成されたプランをチェック。気に入ったらURLで簡単にシェアできます。もちろん修正も自由です。
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* About Tomokichi Diary */}
          <section className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-8 sm:p-12 shadow-sm">
            <h2 className="text-3xl font-serif font-bold text-[#e67e22] mb-6">
              「ともきちの旅行日記」とは？
            </h2>
            <div className="space-y-4 text-stone-700 leading-relaxed">
              <p>
                ともきち（運営者）が実際に訪れた世界中の場所を記録した旅行ブログです。
              </p>
              <p>
                観光地の魅力、グルメ情報、移動手段、宿泊施設のレビューなど、リアルな体験に基づいた情報が詰まっています。
              </p>
              <p>
                Tabideaは、このブログに蓄積された知識をAIで活用することで、単なる観光情報サイトにはない、
                「実際に行った人ならではの視点」を提案に反映しています。
              </p>
            </div>
          </section>

          {/* Important Notice */}
          <section className="bg-orange-50 border-2 border-orange-200 border-dashed rounded-3xl p-8 sm:p-12">
            <h2 className="text-2xl font-serif font-bold text-orange-800 mb-4">
              ⚠️ ご利用の際の注意
            </h2>
            <div className="space-y-3 text-orange-900 leading-relaxed">
              <p>
                Tabideaの提案は、AIによる「アイデアのたたき台」です。
                実際の旅行では、以下の点にご注意ください：
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>施設の営業時間、料金、交通機関の最新情報は必ず公式サイトで確認してください</li>
                <li>AIは時に誤った情報を生成することがあります（ハルシネーション）</li>
                <li>提案内容はあくまで参考とし、最終的な判断はご自身で行ってください</li>
              </ul>
              <p className="text-sm mt-4">
                詳細は{" "}
                <a href="/ai-policy" className="underline font-bold hover:text-orange-700">
                  AIポリシー
                </a>{" "}
                をご確認ください。
              </p>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center space-y-6 py-8">
            <h2 className="text-3xl font-serif font-bold text-[#2c2c2c]">
              さあ、旅の計画を始めよう
            </h2>
            <p className="text-stone-600 font-hand text-lg">
              あなただけの旅の物語を、AIと一緒に紡ぎませんか？
            </p>
            <Link
              href="/"
              className="inline-block bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-full transition-all hover:scale-105 shadow-lg"
            >
              プランを作成する
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
