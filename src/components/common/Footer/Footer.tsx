import Link from "next/link";
import { FaGithub } from "react-icons/fa";

/**
 * フッターコンポーネント
 * サイト全体で使用される共通フッター
 */
export default function Footer() {
  return (
    <footer className="w-full bg-[#fcfbf9] text-[#2c2c2c] py-16 px-4 border-t-2 border-stone-200 border-dashed">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10">
        {/* Brand */}
        <div className="space-y-4 col-span-2 md:col-span-1">
          <Link href="/">
            <h3 className="text-2xl font-serif font-bold text-[#e67e22] hover:opacity-80 transition-opacity inline-block">
              Tabidea
            </h3>
          </Link>
          <p className="text-stone-600 text-sm leading-relaxed max-w-xs font-hand">
            あなたの旅の物語を、AIと一緒に紡ぎ出す。
            <br />
            <span className="text-xs opacity-60">Supported by ともきちの旅行日記</span>
          </p>
          <div className="flex gap-4 pt-2">
            <a
              href="https://github.com/tomoki013/ai-travel-planner"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-[#e67e22] transition-colors"
            >
              <FaGithub size={24} />
            </a>
          </div>
        </div>

        {/* About */}
        <div className="space-y-4">
          <h4 className="font-bold text-stone-800 font-serif">About</h4>
          <ul className="space-y-2 text-sm text-stone-600">
            <li>
              <Link
                href="/about"
                className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline"
              >
                Tabideaについて
              </Link>
            </li>
            <li>
              <Link
                href="/features"
                className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline"
              >
                機能紹介・使い方
              </Link>
            </li>
            <li>
              <Link
                href="/updates"
                className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline"
              >
                アップデート情報
              </Link>
            </li>
          </ul>
        </div>

        {/* Explore */}
        <div className="space-y-4">
          <h4 className="font-bold text-stone-800 font-serif">Explore</h4>
          <ul className="space-y-2 text-sm text-stone-600">
            <li>
              <Link
                href="/samples"
                className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline"
              >
                サンプルプラン集
              </Link>
            </li>
            <li>
              <Link
                href="/travel-info"
                className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline"
              >
                渡航情報・安全ガイド
              </Link>
            </li>
          </ul>
        </div>

        {/* Help */}
        <div className="space-y-4">
          <h4 className="font-bold text-stone-800 font-serif">Help</h4>
          <ul className="space-y-2 text-sm text-stone-600">
            <li>
              <Link
                href="/faq"
                className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline"
              >
                よくある質問
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline"
              >
                お問い合わせ
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div className="space-y-4">
          <h4 className="font-bold text-stone-800 font-serif">Legal</h4>
          <ul className="space-y-2 text-sm text-stone-600">
            <li>
              <Link
                href="/terms"
                className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline"
              >
                利用規約
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline"
              >
                プライバシーポリシー
              </Link>
            </li>
            <li>
              <Link
                href="/cookie-policy"
                className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline"
              >
                クッキーポリシー
              </Link>
            </li>
            <li>
              <Link
                href="/ai-policy"
                className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline"
              >
                AIポリシー
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-stone-200 border-dashed text-center text-xs text-stone-500">
        <p>© 2025-2026 Tabidea. All rights reserved.</p>
      </div>
    </footer>
  );
}
