import Link from 'next/link';
import { FaBookOpen, FaArrowRight } from 'react-icons/fa';
import { JournalSheet, Tape, HandwrittenText } from '@/components/ui/journal';

export default function SampleCollectionPromotionSection() {
  return (
    <div className="w-full max-w-3xl mx-auto mt-16 mb-20 px-4">
      <JournalSheet variant="default" className="relative p-8 overflow-hidden transform -rotate-1 transition-transform hover:rotate-0 duration-500">
        <Tape color="yellow" position="top-center" className="opacity-80 -top-4 w-32" />

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-2">
            <FaBookOpen className="text-2xl text-yellow-600" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold tracking-widest text-stone-400 uppercase">EXPLORE MORE PLANS</p>
            <HandwrittenText tag="h2" className="text-2xl md:text-3xl font-bold text-stone-800">
              他のプランも見てみませんか？
            </HandwrittenText>
          </div>

          <p className="text-stone-600 font-hand leading-relaxed max-w-md">
            Tabideaには他にもたくさんの素敵な旅行プランがあります。<br />
            次の旅行のインスピレーションを見つけましょう。
          </p>

          <Link
            href="/shiori"
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-stone-800 text-white rounded-full font-bold shadow-md hover:bg-stone-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <span className="font-serif">サンプルプラン集を見る</span>
            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </JournalSheet>
    </div>
  );
}
