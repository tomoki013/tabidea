"use client";

import { motion } from "framer-motion";
import { FaBookOpen, FaMagic, FaMapMarkedAlt } from "react-icons/fa";
import { HandwrittenText } from "@/components/ui/journal";

export default function ConceptSection() {
  return (
    <section className="w-full py-24 px-4 bg-white relative overflow-hidden">
      {/* Subtle paper texture background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-30 mix-blend-multiply pointer-events-none" />

      <div className="max-w-6xl mx-auto text-center space-y-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <div className="inline-block px-4 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 text-sm font-bold tracking-wider mb-4">
            Concept
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-stone-800 leading-tight">
            旅の計画は、<br className="md:hidden" />もっと自由でいい。
          </h2>
          <HandwrittenText className="text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto">
            Tabidea（タビデア）は、AIと対話しながらあなただけの旅行プランを作成するサービスです。<br className="hidden md:block" />
            「どこかに行きたい」という漠然とした想いを、数秒で形にします。
          </HandwrittenText>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
           <ConceptCard
             icon={<FaMagic />}
             title="AIが提案"
             desc="好みを伝えるだけで、AIが最適なルートとスポットを提案します。"
             delay={0.2}
           />
           <ConceptCard
             icon={<FaMapMarkedAlt />}
             title="地図で編集"
             desc="直感的な操作で、ルートの並び替えやスポットの追加が可能です。"
             delay={0.4}
           />
           <ConceptCard
             icon={<FaBookOpen />}
             title="旅のしおり"
             desc="完成したプランは、あなただけの「旅のしおり」として保存できます。"
             delay={0.6}
           />
        </div>
      </div>
    </section>
  );
}

function ConceptCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="flex flex-col items-center text-center space-y-4 p-8 rounded-2xl bg-stone-50/50 border border-stone-100 hover:bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
    >
      <div className="w-16 h-16 rounded-full bg-white border border-stone-200 flex items-center justify-center text-2xl text-stone-500 shadow-sm group-hover:text-primary group-hover:border-primary/30 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-stone-800 font-serif">{title}</h3>
      <p className="text-stone-600 text-sm leading-relaxed font-hand">{desc}</p>
    </motion.div>
  );
}
