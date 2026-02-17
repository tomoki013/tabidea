import Link from 'next/link';
import { FaPen, FaArrowRight } from 'react-icons/fa';
import { JournalSheet, Tape, HandwrittenText } from '@/components/ui/journal';

export default function ShioriPromotionSection() {
  return (
    <div className="w-full max-w-3xl mx-auto mt-16 mb-20 px-4">
      <JournalSheet variant="default" className="relative p-8 overflow-hidden transform rotate-1 transition-transform hover:rotate-0 duration-500">
        <Tape color="blue" position="top-center" className="opacity-80 -top-4 w-32" />

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <FaPen className="text-2xl text-primary" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold tracking-widest text-stone-400 uppercase">CREATE YOUR OWN</p>
            <HandwrittenText tag="h2" className="text-2xl md:text-3xl font-bold text-stone-800">
              あなただけの旅のしおりを作りませんか？
            </HandwrittenText>
          </div>

          <p className="text-stone-600 font-hand leading-relaxed max-w-md">
            Tabideaなら、行き先と日程を入れるだけで<br />
            AIがあなたの理想の旅行プランを数秒で提案します。
          </p>

          <Link
            href="/"
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-full font-bold shadow-md hover:bg-primary/90 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <span className="font-serif">無料でプランを作成する</span>
            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </JournalSheet>
    </div>
  );
}
