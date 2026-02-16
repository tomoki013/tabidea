import Link from 'next/link';
import { FaArrowRight, FaPen, FaShareAlt } from 'react-icons/fa';
import { JournalSheet, Tape, HandwrittenText, Stamp } from '@/components/ui/journal';

export default function TravelShioriHeroSection() {
  return (
    <section className="relative w-full py-24 overflow-hidden bg-[#fcfbf9]">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('/images/paper-texture.png')] opacity-20 mix-blend-multiply pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
         <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Text Content */}
            <div className="space-y-8 order-2 lg:order-1">
               <div className="relative pl-4">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 to-transparent rounded-full" />
                  <p className="text-primary font-bold tracking-widest text-sm uppercase mb-2">New Feature</p>
                  <h2 className="text-4xl sm:text-5xl font-serif font-bold text-stone-800 leading-tight">
                    <span className="relative inline-block">
                       旅のしおり
                       <span className="absolute bottom-2 left-0 w-full h-3 bg-yellow-200/60 -z-10 -rotate-1 rounded-sm transform origin-left scale-x-110"></span>
                    </span>
                    を、<br/>
                    もっと自由に。<br/>
                    もっとあなたらしく。
                  </h2>
               </div>

               <p className="text-lg text-stone-600 font-hand leading-relaxed">
                  AIが提案したプランに、あなたの想いやメモを直接書き込める。<br/>
                  まるで手帳のような使い心地で、世界に一つだけの「旅のしおり」が完成します。<br/>
                  URLひとつで、同行者や家族ともかんたんに共有できます。
               </p>

               <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-stone-200 shadow-sm">
                     <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <FaPen />
                     </div>
                     <div>
                        <p className="font-bold text-stone-800 text-sm">直接書き込み</p>
                        <p className="text-xs text-stone-500">直感的な編集体験</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-stone-200 shadow-sm">
                     <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                        <FaShareAlt />
                     </div>
                     <div>
                        <p className="font-bold text-stone-800 text-sm">かんたん共有</p>
                        <p className="text-xs text-stone-500">URLを送るだけ</p>
                     </div>
                  </div>
               </div>

               <div className="pt-4">
                  <Link
                     href="/samples"
                     className="inline-flex items-center gap-2 bg-stone-800 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-stone-700 hover:-translate-y-1 transition-all"
                  >
                     サンプルプランを見る
                     <FaArrowRight />
                  </Link>
               </div>
            </div>

            {/* Visual (Mock Shiori) */}
            <div className="relative order-1 lg:order-2">
               <div className="absolute -inset-4 bg-gradient-to-br from-orange-100/30 to-blue-100/30 rounded-full blur-3xl -z-10" />

               <JournalSheet variant="notebook" className="transform rotate-2 hover:rotate-0 transition-transform duration-500 shadow-2xl max-w-md mx-auto relative border-l-8 border-l-stone-300">
                  <Tape color="blue" position="top-right" className="-top-5 -right-12 w-40 rotate-12 opacity-90" />
                  <Stamp color="red" size="sm" className="absolute -bottom-6 -left-6 rotate-12 opacity-80 z-20 w-24 h-24 text-xs border-4">
                     TRAVEL<br/>SHIORI
                  </Stamp>

                  <div className="space-y-8 py-4">
                     <div className="text-center border-b-2 border-stone-200 border-dashed pb-6">
                        <p className="text-xs font-mono text-stone-400 mb-1">DESTINATION</p>
                        <HandwrittenText className="text-4xl font-bold text-stone-800">Paris, France</HandwrittenText>
                        <p className="text-stone-500 font-hand mt-2 flex justify-center items-center gap-2">
                           <span>2026.04.10</span>
                           <span>→</span>
                           <span>04.15</span>
                        </p>
                     </div>

                     <div className="space-y-6 px-2">
                        <div className="relative pl-6 border-l-2 border-red-200">
                           <span className="absolute -left-[9px] top-1.5 w-4 h-4 bg-white border-4 border-red-300 rounded-full"></span>
                           <div className="bg-red-50 p-3 rounded-lg border border-red-100 transform -rotate-1 shadow-sm">
                              <div className="flex justify-between items-start">
                                 <p className="font-bold text-stone-800">10:00 ルーヴル美術館</p>
                                 <span className="text-xs bg-white px-2 py-0.5 rounded border border-red-200 text-red-400">Activity</span>
                              </div>
                              <p className="text-sm text-red-500 font-hand mt-1">※ チケットは事前予約済み！入口はピラミッドから。</p>
                           </div>
                        </div>

                        <div className="relative pl-6 border-l-2 border-blue-200">
                           <span className="absolute -left-[9px] top-1.5 w-4 h-4 bg-white border-4 border-blue-300 rounded-full"></span>
                           <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                              <div className="flex justify-between items-start">
                                 <p className="font-bold text-stone-800">13:00 カフェ・ド・フロール</p>
                                 <span className="text-xs bg-stone-100 px-2 py-0.5 rounded text-stone-500">Lunch</span>
                              </div>
                              <p className="text-sm text-stone-500 font-hand mt-1">テラス席でクロックムッシュを食べる。</p>
                           </div>
                        </div>

                        <div className="relative pl-6 border-l-2 border-green-200">
                           <span className="absolute -left-[9px] top-1.5 w-4 h-4 bg-white border-4 border-green-300 rounded-full"></span>
                           <div className="bg-white/50 p-2 rounded border border-dashed border-stone-300">
                              <p className="text-stone-400 font-hand text-sm flex items-center gap-2">
                                 <FaPen className="text-xs" />
                                 クリックして予定を追加...
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>
               </JournalSheet>

               {/* Decorative elements around */}
               <div className="absolute -right-8 top-1/2 w-20 h-20 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
            </div>
         </div>
      </div>
    </section>
  );
}
