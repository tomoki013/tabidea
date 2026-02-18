"use client";

import { motion } from "framer-motion";
import { FaMapMarkedAlt, FaPlaneDeparture } from "react-icons/fa";
import { HandwrittenText, Tape, Stamp } from "@/components/ui/journal";
import Image from "next/image";

export default function ConceptSection() {
  return (
    <section className="w-full py-24 px-4 bg-[#fcfbf9] relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')] opacity-40 mix-blend-multiply pointer-events-none" />

      {/* Abstract Shapes for visual interest */}
      <div className="absolute top-20 left-[-10%] w-[40%] h-[40%] bg-orange-100/30 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-10 right-[-5%] w-[30%] h-[30%] bg-blue-100/30 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">

        {/* Left: Content */}
        <div className="space-y-10 relative">
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

            <h2 className="text-4xl md:text-6xl font-serif font-bold text-stone-800 leading-[1.15] mb-6">
              旅の<span className="text-primary">ワクワク</span>を、<br/>
              もっと自由に。<br/>
              もっと簡単に。
            </h2>

            <HandwrittenText className="text-xl md:text-2xl text-stone-600 leading-relaxed max-w-lg block mb-8 relative">
              <span className="absolute -left-4 -top-4 text-stone-200 text-6xl opacity-50 font-serif">“</span>
              ふと思いついた「行きたい」を、<br/>
              AIが瞬時にカタチにします。<br/>
              あなただけの物語を、ここから。
            </HandwrittenText>

            <div className="flex flex-wrap gap-4">
               <div className="flex items-center gap-3 bg-white/80 px-5 py-3 rounded-xl shadow-sm border border-stone-100 backdrop-blur-sm">
                  <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                     <FaMapMarkedAlt />
                  </div>
                  <span className="font-bold text-stone-700 text-sm">AI自動生成</span>
               </div>
               <div className="flex items-center gap-3 bg-white/80 px-5 py-3 rounded-xl shadow-sm border border-stone-100 backdrop-blur-sm">
                  <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                     <FaPlaneDeparture />
                  </div>
                  <span className="font-bold text-stone-700 text-sm">自由なカスタマイズ</span>
               </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Visual Collage */}
        <div className="relative h-[500px] w-full hidden lg:block">
           {/* Decorative elements */}
           <div className="absolute top-0 right-10 rotate-12 z-30 opacity-80">
              <Stamp color="red" size="sm">Original<br/>Trip</Stamp>
           </div>

           {/* Polaroid 1 (Back) */}
           <motion.div
             initial={{ opacity: 0, rotate: -10, y: 50 }}
             whileInView={{ opacity: 1, rotate: -6, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8, delay: 0.2 }}
             className="absolute top-10 left-10 w-64 bg-white p-3 pb-8 shadow-xl rotate-[-6deg] z-10 transform hover:scale-105 hover:rotate-0 transition-all duration-500"
           >
              <Tape color="yellow" position="top-center" className="-top-3 opacity-90 w-24" />
              <div className="w-full h-48 overflow-hidden bg-stone-200">
                 <img
                   src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=500&q=80"
                   alt="Kyoto"
                   className="w-full h-full object-cover grayscale-[20%] contrast-110"
                 />
              </div>
              <div className="mt-3 text-center font-hand text-stone-500 text-lg">Kyoto, Japan</div>
           </motion.div>

           {/* Polaroid 2 (Front) */}
           <motion.div
             initial={{ opacity: 0, rotate: 10, y: 50 }}
             whileInView={{ opacity: 1, rotate: 3, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8, delay: 0.4 }}
             className="absolute bottom-20 right-20 w-72 bg-white p-3 pb-8 shadow-2xl rotate-[3deg] z-20 transform hover:scale-105 hover:rotate-0 transition-all duration-500"
           >
              <Tape color="blue" position="top-right" className="-top-3 -right-2 opacity-90 w-24 rotate-45" />
              <div className="w-full h-56 overflow-hidden bg-stone-200">
                 <img
                   src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80"
                   alt="Paris"
                   className="w-full h-full object-cover"
                 />
              </div>
              <div className="mt-4 flex justify-between items-center px-2">
                 <span className="font-hand text-stone-800 text-xl font-bold">Paris</span>
                 <span className="text-xs text-stone-400 font-sans tracking-widest">2024.10.15</span>
              </div>
           </motion.div>

            {/* Floating Elements */}
            <motion.div
               animate={{ y: [0, -10, 0] }}
               transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur px-6 py-4 rounded-2xl shadow-lg border border-stone-100 z-30"
            >
               <div className="text-center">
                  <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-stone-800">10,000+</p>
               </div>
            </motion.div>
        </div>
      </div>
    </section>
  );
}
