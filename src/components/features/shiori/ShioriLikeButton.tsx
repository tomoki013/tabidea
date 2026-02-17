'use client';

import { useState, useTransition } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

import { toggleShioriLike } from '@/app/actions/shiori';

interface ShioriLikeButtonProps {
  slug: string;
  initialLiked: boolean;
  initialLikesCount: number;
  canLike: boolean;
}

export default function ShioriLikeButton({
  slug,
  initialLiked,
  initialLikesCount,
  canLike,
}: ShioriLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    setErrorMessage(null);

    if (!canLike) {
      setErrorMessage('ログインするといいねできます。');
      return;
    }

    startTransition(async () => {
      const result = await toggleShioriLike(slug);
      if (!result.success) {
        setErrorMessage(result.error ?? 'いいねの更新に失敗しました。');
        return;
      }

      setLiked(result.liked ?? false);
      setLikesCount(result.likesCount ?? 0);
    });
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
          liked
            ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
        }`}
      >
        {liked ? <FaHeart /> : <FaRegHeart />}
        {likesCount}
      </button>
      {errorMessage && <p className="text-xs text-stone-500">{errorMessage}</p>}
    </div>
  );
}
