import Link from 'next/link';
import { FaArrowRight, FaBookOpen } from 'react-icons/fa';
import { Tape, HandwrittenText } from '@/components/ui/journal';

export default function BlogPromotionSection() {
  return (
    <section className="relative w-full py-24 overflow-hidden bg-white">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('/images/grid-paper.png')] opacity-30 mix-blend-multiply pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="bg-[#fcfbf9] rounded-3xl p-8 md:p-12 shadow-sm border border-stone-200 relative overflow-hidden">
          <Tape color="green" position="top-left" className="-top-4 -left-4 w-32 -rotate-12 opacity-80" />

          <div className="grid md:grid-cols-3 gap-8 items-center">
            {/* Icon/Image Area */}
            <div className="hidden md:flex justify-center">
              <div className="relative w-48 h-48 bg-stone-100 rounded-full flex items-center justify-center border-4 border-white shadow-inner">
                <FaBookOpen className="text-stone-300 w-20 h-20" />
                <div className="absolute -bottom-2 -right-2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm transform rotate-6">
                   Update!
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="md:col-span-2 space-y-6">
              <div>
                 <p className="text-primary font-bold tracking-widest text-sm uppercase mb-2">From the Blog</p>
                 <HandwrittenText tag="h2" className="text-3xl md:text-4xl font-bold text-stone-800 mb-4">
                    旅のヒントと最新情報
                 </HandwrittenText>
                 <p className="text-stone-600 leading-relaxed max-w-2xl">
                    Tabideaの便利な使い方から、AIを活用した新しい旅行の計画方法、
                    開発チームからのアップデート情報まで。
                    あなたの旅をもっと豊かにする情報をお届けします。
                 </p>
              </div>

              <div className="flex flex-wrap gap-4">
                 <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 bg-white text-stone-800 border-2 border-stone-200 px-6 py-3 rounded-full font-bold hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow-md"
                 >
                    ブログを読む
                    <FaArrowRight className="text-sm" />
                 </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
