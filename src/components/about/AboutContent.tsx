"use client";

import { motion, Variants } from "framer-motion";
import { TrinityCircle } from "@/components/features/landing";
import StartPlanningButton from "@/components/common/StartPlanningButton";
import {
  FaRobot,
  FaLightbulb,
  FaGlobeAmericas,
  FaUsers,
  FaShieldAlt,
  FaPenFancy,
} from "react-icons/fa";

// Animation variants
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" }
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

export default function AboutContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9] pt-32">
      {/* Hero Section */}
      <section className="relative w-full">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center space-y-6"
          >
            <motion.h1 variants={fadeInUp} className="text-4xl sm:text-6xl font-serif font-bold text-[#2c2c2c] leading-tight">
              Tabideaについて
            </motion.h1>
            <div className="max-w-3xl mx-auto space-y-4">
              <motion.p variants={fadeInUp} className="text-2xl sm:text-3xl font-serif font-bold text-[#e67e22] leading-relaxed">
                心の奥にある『行きたい』を、
                <br className="sm:hidden" />
                一生モノの体験へ。
              </motion.p>
              <motion.p variants={fadeInUp} className="text-lg text-stone-600 font-hand leading-relaxed">
                Tabidea（タビデア）は、あなたの「なんとなくどこかへ行きたい」という想いの奥にある、
                <br className="hidden sm:block" />
                本当の願いをそっとすくい上げ、かたちにしていくトラベルパートナーです。
              </motion.p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 pb-16 sm:pb-24">
        <div className="space-y-24">
          {/* Mission Section */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-8 sm:p-12 shadow-sm"
          >
            <h2 className="text-3xl font-serif font-bold text-[#e67e22] mb-8 text-center sm:text-left">
              私たちのミッション
            </h2>
            <div className="space-y-6 text-stone-700 leading-loose font-serif text-lg">
              <div className="p-6 bg-stone-50 rounded-2xl border-l-4 border-[#e67e22] italic text-stone-600 mb-8">
                <p>
                  「言葉にならない衝動や、ふと湧き上がる違和感。そのすべてが、次の旅のはじまりの合図です。」
                </p>
              </div>
              <p>
                「どこか遠くへ行きたい」「日常を変えたい」。
              </p>
              <p>
                そんな曖昧な願いの裏側には、まだ自分でも気づいていない「本当の望み」が眠っています。
              </p>
              <p>
                Tabideaは、その深層にある想いを丁寧に汲み取り、旅という体験を通してそっと叶えていきます。
              </p>
            </div>
          </motion.section>

          {/* Service Name & Trinity Circle */}
          <section>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-serif font-bold text-[#2c2c2c] mb-4">
                サービス名「Tabidea」に込めた3つのピース
              </h2>
              <p className="text-stone-500">Tabidea = Tabi × Idea × Deai</p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <TrinityCircle />
              </div>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="order-1 lg:order-2 space-y-8"
              >
                {/* Tabi */}
                <motion.div variants={cardVariant} className="relative pl-8 border-l-2 border-[#e67e22]">
                  <h3 className="text-2xl font-serif font-bold text-[#e67e22] mb-3">
                    1. Tabi（旅）
                  </h3>
                  <p className="text-stone-600 leading-relaxed">
                    日常の境界線を越え、新しい景色と自分に出会うための冒険。
                    <br />
                    すべての物語は、ここから始まります。
                  </p>
                </motion.div>

                {/* Idea */}
                <motion.div variants={cardVariant} className="relative pl-8 border-l-2 border-[#27ae60]">
                  <h3 className="text-2xl font-serif font-bold text-[#27ae60] mb-3">
                    2. Idea（アイデア）
                  </h3>
                  <p className="text-stone-600 leading-relaxed">
                    あなた自身さえまだ言語化できていない「旅の種」を、対話を通して見つけ出します。
                    <br />
                    AIが一方的に答えを出すのではなく、あなたの深層心理にある「本当はこんな景色が見たかった」「こんな感情を味わいたかった」という直感を理解し、最適なプランへ昇華させます。
                  </p>
                </motion.div>

                {/* Deai */}
                <motion.div variants={cardVariant} className="relative pl-8 border-l-2 border-[#d35400]">
                  <h3 className="text-2xl font-serif font-bold text-[#d35400] mb-3">
                    3. Deai（出会い）
                  </h3>
                  <p className="text-stone-600 leading-relaxed">
                    緻密にデザインされたプランの上に生まれる、鮮やかな「偶然」。
                    <br />
                    目的地へ向かう途中でふと目に留まる景色、偶然居合わせた人との会話。それらは一見バラバラな出来事に見えて、実はあなたの心の深層と共鳴して引き寄せられた、かけがえのないセレンディピティ（幸せな偶然）です。
                  </p>
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="mt-12 p-6 bg-[#fdf2e9] rounded-2xl text-center max-w-3xl mx-auto"
            >
              <p className="text-[#d35400] font-bold">
                旅そのものだけではなく、その途中に散りばめられた「出会い」まで含めてデザインすることが、Tabideaの価値です。
              </p>
            </motion.div>
          </section>

          {/* Domain Meaning */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2c2c2c] mb-6 flex items-center gap-3">
                <FaGlobeAmericas className="text-primary/40" />
                ドメイン「tabide.ai」に込めた想い
              </h2>
              <div className="grid md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1 bg-stone-50 p-6 rounded-2xl text-center">
                  <span className="block text-2xl font-bold text-[#2c2c2c] mb-2">tabide.ai</span>
                  <span className="text-sm text-stone-500">（タビデ・アイ）</span>
                </div>
                <div className="md:col-span-2 space-y-4 text-stone-700 leading-relaxed">
                  <p>
                    <span className="font-bold text-[#e67e22]">「旅先で（tabide）」</span>と
                    <span className="font-bold text-[#e67e22]">「愛（ai）」</span>
                    という2つの意味を重ねています。
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-stone-600 ml-2">
                    <li>旅先で、本当の自分を支えてくれる存在がいること。</li>
                    <li>旅先で、心から愛せる場所と出会えること。</li>
                  </ul>
                  <p className="pt-2 border-t border-stone-100 mt-4">
                    AIは主役ではなく、あなたの心を映し出し、そっと支える鏡のような存在でありたいと考えています。
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Future Vision */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-center max-w-3xl mx-auto space-y-6"
          >
            <h2 className="text-3xl font-serif font-bold text-[#2c2c2c]">
              未来へのビジョン
            </h2>
            <p className="text-lg text-stone-700 leading-relaxed">
              旅の主役は、いつでも「あなた」というひとりの人間です。
              <br />
              Tabideaは、あなたの心の機微を誰よりも深く理解するパートナーとして、
              効率や便利さだけでなく、人生をそっと彩る「偶然」と「出会い」をこれからも共に描き続けます。
            </p>
            <div className="p-6 bg-white border border-stone-200 shadow-sm rounded-xl italic text-stone-600">
              <p className="mb-2">「あなたの心の中に、どんな景色が眠っていますか？」</p>
              <p>「言葉にならないその想いから、最高の旅を始めましょう。」</p>
              <div className="mt-4 text-right text-sm font-bold text-[#e67e22]">
                Tabidea 運営チーム一同
              </div>
            </div>
          </motion.section>

          {/* MVVC Section */}
          <section className="space-y-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center"
            >
              <h2 className="text-3xl font-serif font-bold text-[#2c2c2c]">
                MVVC (Mission, Vision, Values, Culture)
              </h2>
              <p className="text-stone-500 mt-2">私たちが大切にしていること</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Mission */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={cardVariant}
                transition={{ delay: 0.1 }}
                className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-[#e67e22]">
                    <FaRobot />
                  </div>
                  <h3 className="text-xl font-bold text-[#2c2c2c]">Mission（日々の使命）</h3>
                </div>
                <p className="text-lg font-bold text-stone-800 mb-3">
                  旅の「ノイズ」を消し、想像する「彩り」を最大化する。
                </p>
                <p className="text-sm text-stone-600 leading-relaxed">
                  治安確認や手配の手間など「面倒な作業」は技術で解決し、計画時のワクワクや旅先での感動という「本質的な楽しさ」を広げます。
                </p>
              </motion.div>

              {/* Vision */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={cardVariant}
                transition={{ delay: 0.2 }}
                className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <FaLightbulb />
                  </div>
                  <h3 className="text-xl font-bold text-[#2c2c2c]">Vision（実現したい世界）</h3>
                </div>
                <p className="text-lg font-bold text-stone-800 mb-3">
                  すべての旅人が、自分だけの「正解の旅」に出会える世界。
                </p>
                <p className="text-sm text-stone-600 leading-relaxed">
                  画一的なプランではなく、ユーザー自身が選び取り、編集し、心から満足できる旅を実現します。
                </p>
              </motion.div>
            </div>

            {/* Values */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="bg-stone-50 rounded-3xl p-8 sm:p-12"
            >
              <motion.h3 variants={cardVariant} className="text-2xl font-serif font-bold text-[#2c2c2c] mb-8 text-center">
                Values（行動指針）
              </motion.h3>
              <div className="grid md:grid-cols-3 gap-6">
                <motion.div variants={cardVariant} className="bg-white p-6 rounded-2xl shadow-sm space-y-3">
                  <div className="text-[#e67e22] text-2xl mb-2">
                    <FaUsers />
                  </div>
                  <h4 className="font-bold text-lg text-stone-800">
                    User in the Driver's Seat
                    <span className="block text-xs font-normal text-stone-500 mt-1">主役は常に旅人</span>
                  </h4>
                  <p className="text-sm text-stone-600">
                    技術は「提案」するが、「決定」はユーザー。計画という創造的な時間の楽しさを奪わず、支える存在であること。
                  </p>
                </motion.div>

                <motion.div variants={cardVariant} className="bg-white p-6 rounded-2xl shadow-sm space-y-3">
                  <div className="text-[#e67e22] text-2xl mb-2">
                    <FaShieldAlt />
                  </div>
                  <h4 className="font-bold text-lg text-stone-800">
                    Safety as a Baseline
                    <span className="block text-xs font-normal text-stone-500 mt-1">安心は冒険の土台</span>
                  </h4>
                  <p className="text-sm text-stone-600">
                    正確な情報（外務省データ等）をシームレスに連携させる。安全が担保されて初めて、人は心から旅を楽しめる。
                  </p>
                </motion.div>

                <motion.div variants={cardVariant} className="bg-white p-6 rounded-2xl shadow-sm space-y-3">
                  <div className="text-[#e67e22] text-2xl mb-2">
                    <FaPenFancy />
                  </div>
                  <h4 className="font-bold text-lg text-stone-800">
                    Share the Story
                    <span className="block text-xs font-normal text-stone-500 mt-1">物語を紡ぐ</span>
                  </h4>
                  <p className="text-sm text-stone-600">
                    旅は行って終わりではない。「しおり」や「ブログ」のように形に残し、体験が次の誰かへとつながる仕組みを作る。
                  </p>
                </motion.div>
              </div>
            </motion.div>

            {/* Culture */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="bg-[#2c2c2c] text-white rounded-3xl p-8 sm:p-12 text-center"
            >
              <h3 className="text-2xl font-serif font-bold mb-4">
                Culture（組織文化）
              </h3>
              <p className="text-xl font-bold text-[#e67e22] mb-4">
                「旅する開発者」であれ (Traveler & Builder)
              </p>
              <p className="text-stone-300 max-w-2xl mx-auto">
                自分たちが最強のヘビーユーザーであり続けること。
                <br />
                UXへの執着を持ち、遊び心と信頼性を両立させます。
              </p>
            </motion.div>
          </section>

          {/* Important Notice */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="bg-orange-50 border-2 border-orange-200 border-dashed rounded-3xl p-8 sm:p-12"
          >
            <h2 className="text-2xl font-serif font-bold text-orange-800 mb-4">
              ⚠️ ご利用の際の注意
            </h2>
            <div className="space-y-3 text-orange-900 leading-relaxed">
              <p>
                Tabideaの提案は、AIによる「アイデアのたたき台」です。
                実際の旅行では、以下の点にご注意ください：
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  施設の営業時間、料金、交通機関の最新情報は必ず公式サイトで確認してください
                </li>
                <li>
                  AIは時に誤った情報を生成することがあります（ハルシネーション）
                </li>
                <li>
                  提案内容はあくまで参考とし、最終的な判断はご自身で行ってください
                </li>
              </ul>
              <p className="text-sm mt-4">
                詳細は{" "}
                <a
                  href="/ai-policy"
                  className="underline font-bold hover:text-orange-700"
                >
                  AIポリシー
                </a>{" "}
                をご確認ください。
              </p>
            </div>
          </motion.section>

          {/* Subtle Branding Mention */}
           <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center text-xs text-stone-400 font-hand opacity-70"
          >
            <p>Supported by <a href="https://travel.tomokichidiary.com/" target="_blank" rel="noopener noreferrer" className="hover:text-stone-500 underline decoration-dashed">ともきちの旅行日記</a></p>
          </motion.div>

          {/* CTA Section */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center space-y-6 py-8"
          >
            <h2 className="text-3xl font-serif font-bold text-[#2c2c2c]">
              さあ、旅の計画を始めよう
            </h2>
            <p className="text-stone-600 font-hand text-lg">
              あなただけの旅の物語を、AIと一緒に紡ぎませんか？
            </p>
            <StartPlanningButton />
          </motion.section>
        </div>
      </main>
    </div>
  );
}
