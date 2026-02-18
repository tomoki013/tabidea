"use client";

import { motion } from "framer-motion";
import { HandwrittenText, Tape, Stamp } from "@/components/ui/journal";
import { FaMapMarkedAlt, FaPenFancy, FaRegSmileBeam } from "react-icons/fa";

export default function FeaturesSection() {
  const values = [
    {
      id: "freedom",
      title: "主役は、あなた。",
      subtitle: "AIはあくまで「提案」役。",
      desc: "行きたい場所、食べたいもの、予算。すべてあなたの思い通りにカスタマイズ。AIが作ったプランをベースに、自分好みに書き換える楽しさを。",
      image: "https://images.unsplash.com/photo-1512413914633-b5043f4041ea?auto=format&fit=crop&w=500&q=80",
      icon: <FaMapMarkedAlt />,
      rotate: "rotate-2",
      tapeColor: "yellow",
      stamp: "My Way"
    },
    {
      id: "story",
      title: "物語を残す。",
      subtitle: "計画が「しおり」になる。",
      desc: "作ったプランは、そのまま旅のしおり（Travel Journal）として持ち歩けます。旅の思い出や写真を記録して、あなただけの物語を完成させましょう。",
      image: "https://images.unsplash.com/photo-1544367563-12123d8965cd?auto=format&fit=crop&w=500&q=80",
      icon: <FaPenFancy />,
      rotate: "-rotate-1",
      tapeColor: "blue",
      stamp: "Memory"
    },
    {
      id: "serendipity",
      title: "予期せぬ出会い。",
      subtitle: "効率だけじゃない旅を。",
      desc: "最短ルートも大事だけど、ちょっと寄り道も悪くない。Tabideaは、あなたの心の奥にある「本当に行きたかった場所」との出会いをサポートします。",
      image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=500&q=80",
      icon: <FaRegSmileBeam />,
      rotate: "rotate-3",
      tapeColor: "red",
      stamp: "Serendipity"
    }
  ];

  return (
    <section className="w-full py-24 px-4 bg-stone-100 relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] opacity-30 mix-blend-multiply pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20 space-y-4"
        >
          <div className="inline-block px-4 py-1.5 bg-white border border-stone-300 shadow-sm rotate-[-2deg]">
            <span className="text-stone-600 font-hand font-bold text-lg tracking-wider">
              Why Tabidea?
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-stone-800">
            旅を、もっと「自分らしく」。
          </h2>
          <p className="text-stone-600 max-w-2xl mx-auto font-medium">
            ただのスケジュール管理ツールではありません。<br/>
            あなたの旅への想いをカタチにする、3つの約束。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 items-start">
          {values.map((value, index) => (
            <motion.div
              key={value.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              className={`relative bg-white p-6 pb-12 shadow-lg ${value.rotate} transition-transform hover:scale-105 hover:rotate-0 duration-300`}
            >
              {/* Tape Decoration */}
              <Tape
                color={value.tapeColor as "yellow" | "blue" | "red"}
                position="top-center"
                className="-top-4 w-32 opacity-90"
              />

              {/* Image Area */}
              <div className="w-full h-48 bg-stone-200 mb-6 overflow-hidden relative border border-stone-100">
                 <img
                   src={value.image}
                   alt={value.title}
                   className="w-full h-full object-cover sepia-[0.2]"
                 />
                 <div className="absolute bottom-2 right-2 opacity-80 rotate-[-12deg]">
                    <Stamp color={value.tapeColor as "red" | "blue"} size="sm">
                       {value.stamp}
                    </Stamp>
                 </div>
              </div>

              {/* Text Content */}
              <div className="space-y-3 text-center">
                 <div className="flex justify-center text-3xl text-stone-400 mb-2 opacity-50">
                    {value.icon}
                 </div>
                 <h3 className="text-2xl font-serif font-bold text-stone-800">
                    {value.title}
                 </h3>
                 <p className="text-sm font-bold text-primary tracking-wide uppercase">
                    {value.subtitle}
                 </p>
                 <div className="w-12 h-0.5 bg-stone-200 mx-auto my-3" />
                 <p className="text-stone-600 text-sm leading-relaxed font-medium">
                    {value.desc}
                 </p>
              </div>

              {/* Handwriting Note at bottom */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                 <HandwrittenText className="text-stone-400 text-xs">
                    Step {index + 1}
                 </HandwrittenText>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Decorative Note */}
        <motion.div
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           viewport={{ once: true }}
           transition={{ delay: 0.8 }}
           className="mt-20 text-center"
        >
           <div className="inline-block relative p-6 bg-[#fffdf5] border border-stone-200 shadow-sm rotate-1 max-w-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-stone-300 shadow-inner" /> {/* Pin hole */}
              <p className="font-hand text-lg text-stone-700 leading-relaxed">
                 “旅の主役は、いつでも「あなた」というひとりの人間です。<br/>
                 Tabideaは、あなたの心の機微を誰よりも深く理解するパートナーでありたい。”
              </p>
              <div className="mt-2 text-right text-xs font-bold text-stone-400 uppercase tracking-widest">
                 - Tabidea Team
              </div>
           </div>
        </motion.div>
      </div>
    </section>
  );
}
