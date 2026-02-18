"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FaArrowRight, FaHeart, FaUserCircle } from "react-icons/fa";

const SAMPLE_PLANS = [
  {
    id: 1,
    title: "京都の紅葉を満喫する旅",
    days: "2泊3日",
    budget: "5万円",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=500&q=80",
    tags: ["#紅葉", "#歴史", "#グルメ"],
    likes: 124
  },
  {
    id: 2,
    title: "ハワイでリフレッシュ",
    days: "4泊6日",
    budget: "20万円",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80",
    tags: ["#ビーチ", "#ショッピング", "#女子旅"],
    likes: 89
  },
  {
    id: 3,
    title: "パリの美術館巡り",
    days: "5泊7日",
    budget: "30万円",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80",
    tags: ["#アート", "#カフェ", "#一人旅"],
    likes: 256
  },
  {
    id: 4,
    title: "ニューヨークのクリスマス",
    days: "3泊5日",
    budget: "25万円",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=500&q=80",
    tags: ["#イルミネーション", "#ショッピング"],
    likes: 180
  },
  {
    id: 5,
    title: "サントリーニ島の絶景",
    days: "4泊6日",
    budget: "40万円",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=500&q=80",
    tags: ["#絶景", "#ハネムーン"],
    likes: 312
  }
];

export default function CommunitySection() {
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
            <span className="text-primary font-bold tracking-widest text-sm uppercase">Community</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight">
              みんなの旅を、<br/>
              次の旅のヒントに。
            </h2>
            <p className="text-stone-400 max-w-lg">
              Tabideaで作成された実際のプランを見てみましょう。<br/>
              気に入ったプランはコピーして、自分好みにカスタマイズできます。
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Link
              href="/shiori"
              className="inline-flex items-center gap-2 text-white border-b border-primary pb-1 hover:text-primary transition-colors group"
            >
              <span>もっと見る</span>
              <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Horizontal Scroll Container */}
        <div className="relative">
          <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory px-4 scrollbar-hide -mx-4 md:mx-0 mask-image-linear-gradient-to-r">
            {SAMPLE_PLANS.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="snap-center shrink-0 w-[280px] md:w-[320px]"
              >
                <div className="group relative bg-stone-800 rounded-2xl overflow-hidden hover:-translate-y-2 transition-transform duration-300 shadow-lg border border-stone-700">
                  {/* Image */}
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={plan.image}
                      alt={plan.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white text-sm">
                      <FaHeart className="text-pink-500" />
                      <span>{plan.likes}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      {plan.tags.map(tag => (
                        <span key={tag} className="text-xs text-stone-400 bg-stone-700/50 px-2 py-1 rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-bold text-lg leading-snug group-hover:text-primary transition-colors">
                      {plan.title}
                    </h3>
                    <div className="flex justify-between items-center pt-2 border-t border-stone-700 text-sm text-stone-400">
                      <span>{plan.days}</span>
                      <span>{plan.budget}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* "View More" Card */}
            <div className="snap-center shrink-0 w-[200px] flex items-center justify-center">
               <Link href="/shiori" className="flex flex-col items-center gap-4 text-stone-400 hover:text-white transition-colors group p-8 rounded-2xl border-2 border-dashed border-stone-700 hover:border-primary">
                  <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-primary transition-colors">
                     <FaArrowRight className="text-xl" />
                  </div>
                  <span className="font-bold">全てのプランを見る</span>
               </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
