import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '購入完了 | Tabidea',
  description: 'ご購入ありがとうございます。',
};

interface SuccessPageProps {
  searchParams: Promise<{
    session_id?: string;
  }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-4">
          ご購入ありがとうございます！
        </h1>
        <p className="text-stone-600 mb-8">
          お支払いが完了しました。
          <br />
          さっそく旅行プランを作成してみましょう。
        </p>

        {/* Session ID (for debugging) */}
        {sessionId && process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-stone-400 mb-6 break-all">
            Session ID: {sessionId}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
          >
            プランを作成する
          </Link>
          <Link
            href="/mypage"
            className="px-6 py-3 border border-stone-300 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
          >
            マイページを見る
          </Link>
        </div>

        {/* Additional Info */}
        <div className="mt-12 p-4 bg-white rounded-xl border border-stone-200">
          <h3 className="font-medium text-stone-800 mb-2">次のステップ</h3>
          <ul className="text-sm text-stone-600 text-left space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                1
              </span>
              <span>行きたい場所や日程を入力</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                2
              </span>
              <span>AIが最適な旅行プランを生成</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                3
              </span>
              <span>プランを保存・共有</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
