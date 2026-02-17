import Link from 'next/link';
import Image from 'next/image';
import { FaArrowRight, FaBookOpen, FaPlaneDeparture, FaStar } from 'react-icons/fa';
import { Tape, HandwrittenText } from '@/components/ui/journal';

export default function BlogPromotionSection() {
  return (
    <section className="relative w-full py-24 md:py-32 overflow-hidden bg-white">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('/images/grid-paper.png')] opacity-20 mix-blend-multiply pointer-events-none" />
      <div className="absolute -left-20 top-1/2 w-64 h-64 bg-green-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-[#fcfbf9] rounded-[2.5rem] p-8 md:p-16 shadow-2xl border-4 border-stone-100 relative overflow-hidden group hover:border-stone-200 transition-colors duration-500">

          {/* Decorative Tape */}
          <Tape color="green" position="top-left" className="-top-6 -left-6 w-40 -rotate-12 opacity-80 z-20 shadow-md" />

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

             {/* Content Area */}
            <div className="space-y-8 order-2 lg:order-1">
              <div>
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100/50 text-green-700 border border-green-200 text-xs font-bold uppercase tracking-wider mb-4">
                    <FaBookOpen className="text-xs" />
                    Everyone's Blog
                 </div>
                 <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-800 mb-6 leading-tight relative inline-block">
                    みんなの<br/>
                    <span className="relative z-10">
                       旅行記
                       <span className="absolute -bottom-2 left-0 w-full h-4 bg-green-200/40 -z-10 rounded-sm transform -rotate-1"></span>
                    </span>
                 </h2>
                 <p className="text-lg text-stone-600 leading-relaxed font-hand">
                    実際に訪れた場所、食べたもの、感じたこと。<br/>
                    みんなのリアルな体験談から、新しい旅の発見があるかもしれません。
                 </p>
              </div>

              <div className="space-y-4">
                 <BlogHighlight
                    title="3泊4日の京都旅行！穴場スポット巡り"
                    category="Kyoto"
                    date="2026.04.15"
                 />
                 <BlogHighlight
                    title="初めての台湾一人旅、食べ歩き記録"
                    category="Taiwan"
                    date="2026.05.01"
                    isNew
                 />
                 <BlogHighlight
                    title="北海道で大自然を満喫する旅"
                    category="Hokkaido"
                    date="2026.05.10"
                 />
              </div>

              <div className="pt-4">
                 <Link
                    href="/blog"
                    className="inline-flex items-center gap-3 bg-white text-stone-800 border-2 border-stone-200 px-8 py-4 rounded-full font-bold hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow-lg hover:-translate-y-1"
                 >
                    ブログを読む
                    <FaArrowRight />
                 </Link>
              </div>
            </div>

            {/* Visual Area - Right */}
            <div className="relative order-1 lg:order-2 hidden lg:block">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-green-50 rounded-full blur-3xl -z-10" />

               {/* Mock Browser Window / Blog Post */}
               <div className="relative transform rotate-3 transition-transform hover:rotate-1 duration-500">
                  <div className="bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden max-w-sm mx-auto">
                     {/* Window Header */}
                     <div className="bg-stone-100 border-b border-stone-200 px-4 py-3 flex items-center gap-2">
                        <div className="flex gap-1.5">
                           <div className="w-3 h-3 rounded-full bg-red-400" />
                           <div className="w-3 h-3 rounded-full bg-yellow-400" />
                           <div className="w-3 h-3 rounded-full bg-green-400" />
                        </div>
                        <div className="flex-1 text-center">
                           <div className="bg-white border border-stone-200 rounded-md py-1 px-4 text-[10px] text-stone-400 font-mono inline-block w-32 truncate">
                              tabide.ai/blog/tips
                           </div>
                        </div>
                     </div>
                     {/* Window Body */}
                     <div className="p-0">
                        <div className="h-40 bg-stone-200 relative overflow-hidden group-hover:scale-105 transition-transform duration-700">
                           <div className="absolute inset-0 flex items-center justify-center text-stone-400 bg-stone-100">
                              <FaPlaneDeparture size={48} className="opacity-20" />
                           </div>
                           <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white">
                              <span className="text-xs font-bold bg-primary px-2 py-0.5 rounded text-white mb-1 inline-block">Tips</span>
                              <p className="font-bold text-sm truncate">How to Plan Your Next Trip with AI</p>
                           </div>
                        </div>
                        <div className="p-6 space-y-4 bg-white relative z-10">
                           <div className="space-y-2">
                              <div className="h-2 bg-stone-100 rounded w-full" />
                              <div className="h-2 bg-stone-100 rounded w-5/6" />
                              <div className="h-2 bg-stone-100 rounded w-4/6" />
                           </div>
                           <div className="pt-2 flex justify-between items-center border-t border-stone-100 mt-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-full bg-stone-200" />
                                 <div className="h-2 w-16 bg-stone-100 rounded" />
                              </div>
                              <FaStar className="text-yellow-400 text-xs" />
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Floating Elements */}
                  <div className="absolute -right-8 top-12 bg-white p-3 rounded-lg shadow-lg border border-stone-100 transform rotate-12 animate-float-slow">
                     <span className="text-2xl">💡</span>
                  </div>
                  <div className="absolute -left-4 bottom-12 bg-white p-3 rounded-lg shadow-lg border border-stone-100 transform -rotate-12 animate-float-delayed">
                     <span className="text-2xl">📝</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BlogHighlight({ title, category, date, isNew }: { title: string, category: string, date: string, isNew?: boolean }) {
   return (
      <Link href="/blog" className="block group">
         <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-stone-100 hover:border-primary/30 hover:shadow-md transition-all duration-300 transform hover:-translate-x-1">
            <div className="flex flex-col items-center justify-center w-14 h-14 bg-stone-50 rounded-lg border border-stone-100 shrink-0 text-center">
               <span className="text-xs font-bold text-stone-400 uppercase leading-none">{category.substring(0, 3)}</span>
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1">
                  {isNew && (
                     <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wider">New</span>
                  )}
                  <span className="text-xs text-stone-400 font-mono">{date}</span>
               </div>
               <h3 className="font-bold text-stone-700 truncate group-hover:text-primary transition-colors">{title}</h3>
            </div>
            <FaArrowRight className="text-stone-300 group-hover:text-primary transform group-hover:translate-x-1 transition-all" />
         </div>
      </Link>
   );
}
