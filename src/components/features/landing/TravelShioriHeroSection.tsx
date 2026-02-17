import Link from 'next/link';
import Image from 'next/image';
import { FaArrowRight, FaPen, FaShareAlt, FaMapMarkedAlt, FaImages } from 'react-icons/fa';
import { JournalSheet, Tape, HandwrittenText, Stamp } from '@/components/ui/journal';

export default function TravelShioriHeroSection() {
  return (
    <section className="relative w-full py-24 md:py-32 overflow-hidden bg-[#fcfbf9]">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('/images/paper-texture.png')] opacity-20 mix-blend-multiply pointer-events-none" />
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-orange-50/50 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
         <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Visual (Mock Shiori Cards) - Left on PC for better flow */}
            <div className="relative order-2 lg:order-1 mt-12 lg:mt-0">
               {/* Background Glow */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-orange-100/40 via-blue-100/40 to-purple-100/40 rounded-full blur-3xl -z-10 animate-pulse-slow" />

               {/* Card 1: Main Plan */}
               <div className="relative z-20 transform -rotate-3 transition-transform hover:rotate-0 duration-500 hover:z-30">
                  <JournalSheet variant="notebook" className="shadow-2xl max-w-sm mx-auto border-l-8 border-l-stone-300">
                     <Tape color="blue" position="top-center" className="-top-4 w-32 opacity-90" />
                     <div className="py-4 px-2">
                        <div className="relative aspect-video w-full bg-stone-100 mb-4 rounded overflow-hidden border border-stone-200">
                           {/* Placeholder for Plan Image */}
                           <div className="absolute inset-0 flex items-center justify-center text-stone-300">
                              <FaImages size={40} />
                           </div>
                           <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">
                              Paris, France
                           </div>
                        </div>
                        <HandwrittenText className="text-2xl font-bold text-stone-800 mb-1">Paris Art Trip</HandwrittenText>
                        <p className="text-stone-500 text-xs font-mono mb-4">2026.04.10 - 04.15</p>

                        <div className="space-y-3">
                           <div className="flex items-center gap-3 p-2 bg-red-50 rounded border border-red-100">
                              <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-red-200 text-lg">🎨</span>
                              <div className="flex-1">
                                 <p className="text-xs font-bold text-stone-700">ルーヴル美術館</p>
                                 <p className="text-[10px] text-stone-500">9:00 - 予約済み</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3 p-2 bg-orange-50 rounded border border-orange-100">
                              <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-orange-200 text-lg">🥐</span>
                              <div className="flex-1">
                                 <p className="text-xs font-bold text-stone-700">ベーカリー巡り</p>
                                 <p className="text-[10px] text-stone-500">マレ地区周辺</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </JournalSheet>
               </div>

               {/* Card 2: Mobile View Hint */}
               <div className="absolute -right-4 -bottom-12 z-10 w-48 hidden sm:block transform rotate-6 transition-transform hover:rotate-3 duration-500 hover:z-30">
                  <div className="bg-stone-800 rounded-[2rem] p-3 shadow-xl border-4 border-stone-700">
                     <div className="bg-white rounded-[1.5rem] overflow-hidden h-64 relative">
                        <div className="absolute top-0 inset-x-0 h-6 bg-stone-100 border-b border-stone-200 z-10 flex justify-center items-center">
                           <div className="w-16 h-4 bg-stone-200 rounded-full" />
                        </div>
                        <div className="p-4 pt-8 space-y-4">
                           <div className="h-24 bg-blue-50 rounded-lg border border-blue-100 p-2">
                              <div className="w-8 h-8 bg-blue-200 rounded-full mb-2" />
                              <div className="h-2 bg-blue-200 rounded w-2/3" />
                           </div>
                           <div className="h-16 bg-stone-50 rounded-lg border border-stone-100" />
                        </div>
                        {/* Floating Action Button */}
                        <div className="absolute bottom-4 right-4 w-10 h-10 bg-primary rounded-full shadow-lg flex items-center justify-center text-white">
                           <FaPen size={14} />
                        </div>
                     </div>
                  </div>
               </div>

               <Stamp color="red" size="md" className="absolute -top-6 -left-6 rotate-[-15deg] z-30 opacity-90 border-4 bg-white/80 backdrop-blur-sm">
                  TRAVEL<br/>SHIORI
               </Stamp>
            </div>

            {/* Text Content - Right */}
            <div className="space-y-10 order-1 lg:order-2">
               <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/50 text-orange-600 border border-orange-200 text-xs font-bold uppercase tracking-wider mb-4">
                     <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                     New Feature
                  </div>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-stone-800 leading-[1.1]">
                    旅のしおりを、<br/>
                    <span className="relative inline-block text-primary">
                       もっと自由に。
                       <svg className="absolute w-full h-3 -bottom-1 left-0 text-yellow-300 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                          <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" className="opacity-60" />
                       </svg>
                    </span>
                  </h2>
               </div>

               <p className="text-lg md:text-xl text-stone-600 font-hand leading-relaxed max-w-lg">
                  AIが提案したプランに、あなたの想いやメモを直接書き込める。<br/>
                  まるで手帳のような使い心地で、世界に一つだけの「旅のしおり」が完成します。
               </p>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FeatureCard
                     icon={<FaPen />}
                     title="直感的な編集"
                     desc="ドラッグ&ドロップで予定を入れ替え。メモも写真も自由に追加。"
                     color="blue"
                  />
                  <FeatureCard
                     icon={<FaShareAlt />}
                     title="かんたん共有"
                     desc="URLを送るだけで、家族や友人とリアルタイムに旅程をシェア。"
                     color="orange"
                  />
                  <FeatureCard
                     icon={<FaMapMarkedAlt />}
                     title="スマートマップ"
                     desc="旅程に合わせて地図が自動更新。移動ルートもひと目で確認。"
                     color="green"
                  />
               </div>

               <div className="pt-4 flex flex-col sm:flex-row gap-4">
                  <Link
                     href="/shiori"
                     className="inline-flex justify-center items-center gap-3 bg-stone-800 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:bg-stone-700 hover:-translate-y-1 transition-all duration-300"
                  >
                     みんなの旅のしおりを見る
                     <FaArrowRight />
                  </Link>
               </div>
            </div>
         </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: 'blue' | 'orange' | 'green' }) {
   const colorClasses = {
      blue: 'bg-blue-50 text-blue-600 border-blue-100',
      orange: 'bg-orange-50 text-orange-600 border-orange-100',
      green: 'bg-green-50 text-green-600 border-green-100',
   };

   return (
      <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
         <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${colorClasses[color]} border`}>
            {icon}
         </div>
         <div>
            <h3 className="font-bold text-stone-800 mb-1">{title}</h3>
            <p className="text-xs text-stone-500 leading-relaxed">{desc}</p>
         </div>
      </div>
   );
}
