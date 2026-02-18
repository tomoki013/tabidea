"use client";

import { motion } from "framer-motion";
import TrinityCircle from "@/components/features/landing/TrinityCircle/TrinityCircle";
import { HandwrittenText } from "@/components/ui/journal";

export default function ConceptSection() {
  return (
    <section className="w-full py-24 px-4 bg-[#fcfbf9] relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')] opacity-40 mix-blend-multiply pointer-events-none" />

      {/* Abstract Shapes for visual interest */}
      <div className="absolute top-20 left-[-10%] w-[40%] h-[40%] bg-orange-100/30 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-10 right-[-5%] w-[30%] h-[30%] bg-blue-100/30 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">

        {/* Left: Content (Philosophy) */}
        <div className="space-y-10 relative text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block relative mb-6">
              <span className="relative z-10 px-4 py-1 font-bold text-sm tracking-widest text-stone-500 uppercase border-b-2 border-stone-300">
                Concept
              </span>
            </div>

            <h2 className="text-3xl md:text-5xl font-serif font-bold text-stone-800 leading-[1.2] mb-6">
              <span className="text-[#e67e22]">Tabi</span> × <span className="text-[#27ae60]">Idea</span> × <span className="text-[#d35400]">Deai</span>
              <br/>
              <span className="text-2xl md:text-3xl mt-2 block text-stone-600">
                旅と、発想と、出会いを紡ぐ。
              </span>
            </h2>

            <HandwrittenText className="text-lg md:text-xl text-stone-600 leading-relaxed max-w-lg block mb-8 relative mx-auto lg:mx-0">
              <span className="absolute -left-6 -top-6 text-stone-200 text-6xl opacity-50 font-serif">“</span>
              ふとした「行きたい」が、<br/>
              一生モノの物語に変わる瞬間。<br/>
              AIが提案するのは、ただの予定表ではなく<br/>
              あなただけの「旅のしおり」です。
            </HandwrittenText>

            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-stone-100 shadow-sm text-left relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#e67e22] via-[#27ae60] to-[#d35400]" />
               <p className="text-stone-700 font-medium leading-loose text-sm md:text-base">
                  <span className="font-bold text-[#e67e22]">Tabidea</span>は、効率的なルート提案だけでなく、
                  旅先での<span className="font-bold text-[#d35400]">「偶然の出会い (Deai)」</span>や、
                  あなた自身の<span className="font-bold text-[#27ae60]">「潜在的な願望 (Idea)」</span>を引き出し、
                  世界に一つだけの<span className="font-bold text-[#e67e22]">「旅 (Tabi)」</span>を創造します。
               </p>
            </div>
          </motion.div>
        </div>

        {/* Right: Trinity Circle Visualization */}
        <div className="relative flex justify-center items-center h-[400px] w-full">
           {/* We use the existing TrinityCircle component here */}
           <div className="scale-90 md:scale-100">
              <TrinityCircle />
           </div>
        </div>
      </div>
    </section>
  );
}
