import Link from "next/link";
import { FaGithub } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="w-full bg-[#fcfbf9] text-[#2c2c2c] py-16 px-4 border-t-2 border-stone-200 border-dashed">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">

        {/* Brand */}
        <div className="space-y-4 md:col-span-2">
          <h3 className="text-2xl font-serif font-bold text-[#e67e22]">AI Travel Planner</h3>
          <p className="text-stone-600 text-sm leading-relaxed max-w-xs font-hand">
            あなたの旅の物語を、AIと一緒に紡ぎ出す。<br />
            Powered by ともきちの旅行日記
          </p>
          <div className="flex gap-4 pt-2">
            <a href="https://github.com/tomoki013/ai-travel-planner" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#e67e22] transition-colors"><FaGithub size={24} /></a>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-4">
          <h4 className="font-bold text-stone-800 font-serif">Menu</h4>
          <ul className="space-y-2 text-sm text-stone-600">
            <li><Link href="/" className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline">ホーム</Link></li>
            {/* <li><Link href="#" className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline">使い方</Link></li> */}
            <li><Link href="/faq" className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline">よくある質問</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div className="space-y-4">
          <h4 className="font-bold text-stone-800 font-serif">Legal</h4>
          <ul className="space-y-2 text-sm text-stone-600">
            <li><Link href="/terms" className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline">利用規約</Link></li>
            <li><Link href="/privacy" className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline">プライバシーポリシー</Link></li>
            {/* <li><Link href="#" className="hover:text-[#e67e22] transition-colors decoration-dashed hover:underline">特定商取引法に基づく表記</Link></li> */}
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-stone-200 border-dashed text-center text-xs text-stone-500">
        <p>© 2025 AI Travel Planner. All rights reserved.</p>
        <p className="mt-2 opacity-70">
          ※本サイトはデモ目的で作成されています。実際の旅行の際は各自治体や施設の最新情報をご確認ください。
        </p>
      </div>
    </footer>
  );
}
