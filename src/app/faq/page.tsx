import FAQCategoryList from "@/components/faq/FAQCategoryList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "よくある質問 - Tabidea (タビデア)",
  description: "Tabideaの使い方、プラン作成、料金、AIの安全性などに関するよくある質問と回答をまとめています。",
};

export default function FAQPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9]">
      {/* Header Section */}
      <div className="relative w-full py-16 md:py-24 px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(#e67e22_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full border border-[#e67e22]/30 bg-[#e67e22]/5 text-[#e67e22] text-sm font-bold tracking-wider mb-4">
            SUPPORT CENTER
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#2c2c2c] tracking-tight">
            よくある質問
          </h1>
          <p className="text-stone-600 font-hand text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Tabideaのご利用について、<br className="md:hidden" />
            疑問や不安な点はここで解決しましょう。<br />
            旅行の準備と同じくらい、スムーズな体験を。
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 md:px-6 pb-20">
        <FAQCategoryList />

        {/* Contact CTA */}
        <div className="max-w-2xl mx-auto mt-12 mb-20 p-8 md:p-12 bg-white rounded-xl border border-stone-200 shadow-sm text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#e67e22] to-[#f39c12]" />
          <h3 className="text-2xl font-serif font-bold text-[#2c2c2c]">
            解決しませんでしたか？
          </h3>
          <p className="text-stone-600 leading-relaxed">
            その他、ご不明な点やご要望がございましたら、<br />
            お問い合わせフォームよりお気軽にご連絡ください。
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center px-8 py-3 bg-[#2c2c2c] text-white font-bold rounded-full hover:bg-[#4a4a4a] transition-all hover:scale-105 shadow-md group"
          >
            <span>お問い合わせへ</span>
          </a>
        </div>
      </main>
    </div>
  );
}
