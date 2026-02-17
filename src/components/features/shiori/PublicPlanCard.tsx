import Link from 'next/link';
import Image from 'next/image';
import { FaCalendarAlt, FaMapMarkerAlt, FaHeart, FaBookOpen } from 'react-icons/fa';
import { PublicShioriListItem } from '@/types';
import { Tape } from '@/components/ui/journal';

interface PublicPlanCardProps {
  plan: PublicShioriListItem;
}

export default function PublicPlanCard({ plan }: PublicPlanCardProps) {
  const destination = plan.destination || '未定の目的地';

  const days = plan.durationDays || 0;
  const nights = Math.max(0, days - 1);
  const duration = days > 0 ? `${nights}泊${days}日` : '期間未定';

  return (
    <Link href={`/shiori/${plan.slug}`} className="block group h-full">
      <div className="relative bg-white h-full flex flex-col shadow-sm border border-stone-200 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:rotate-1 rounded-sm overflow-hidden">

        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden bg-stone-100 border-b border-stone-100">
          {plan.thumbnailUrl ? (
            <Image
              src={plan.thumbnailUrl}
              alt={destination}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-50">
              <FaMapMarkerAlt size={32} />
            </div>
          )}

          {/* Tape Effect */}
          <Tape color="white" position="top-center" className="opacity-90 -top-3 w-24 z-10" />

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

          <div className="absolute bottom-3 left-3 right-3">
             <h3 className="font-serif font-bold text-xl text-white drop-shadow-md line-clamp-2 leading-tight">
              {destination}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col justify-between bg-[#fcfbf9]">
          <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
            <span className="flex items-center gap-1 bg-stone-100 px-2 py-1 rounded-full">
              <FaCalendarAlt className="text-stone-400" />
              {duration}
            </span>
            <span>
              {new Date(plan.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 border border-stone-200">
              <FaBookOpen className="text-stone-400" />
              記録 {plan.entriesCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 border border-stone-200">
              <FaHeart className="text-rose-400" />
              いいね {plan.likesCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
