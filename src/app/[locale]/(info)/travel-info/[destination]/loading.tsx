import { LoadingState } from '@/components/features/travel-info';

/**
 * 目的地ページのローディング表示
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9]">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <LoadingState
          message="渡航情報を読み込み中..."
          categoryCount={3}
        />
      </div>
    </div>
  );
}
