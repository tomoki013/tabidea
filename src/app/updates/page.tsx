import React from "react";
import type { Metadata } from "next";
import { FaFlag, FaCheck, FaTools } from "react-icons/fa";

export const metadata: Metadata = {
  title: "更新情報・ロードマップ - AI Travel Planner",
  description: "AI Travel Plannerの更新情報と今後の開発ロードマップを掲載しています。",
};

type RoadmapItem = {
  status: "done" | "planned" | "developing";
  date?: string; // For done items
  title: string;
  description: string;
};

const roadmapData: RoadmapItem[] = [
  {
    status: "developing",
    title: "プランの保存機能",
    description: "生成した旅行プランをブラウザに保存し、後から確認できる機能を開発中です。",
  },
  {
    status: "planned",
    title: "プランの画像共有",
    description: "旅行プランを綺麗な画像として書き出し、SNSでシェアしやすくする機能を検討しています。",
  },
  {
    status: "planned",
    title: "ユーザーアカウント機能",
    description: "ログインすることで、複数のデバイスでプランを同期したり、過去の履歴を管理できるようになります。",
  },
  {
    status: "planned",
    title: "スポット詳細情報の拡充",
    description: "各観光スポットの営業時間や料金など、より詳細な情報をAIが提案できるように改善します。",
  },
  {
    status: "done",
    date: "2025.02.16", // Approximate date based on context
    title: "β版サービス公開",
    description: "AI Travel Plannerのβ版を公開しました。Gemini AIを活用した旅行プラン生成が可能です。",
  },
];

export default function UpdatesPage() {
  return (
    <div className="min-h-screen p-8 sm:p-20 font-sans">
      <main className="max-w-3xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2c2c2c] mb-4">
            Updates & Roadmap
          </h1>
          <p className="text-stone-600 font-hand text-lg">
            AI Travel Plannerのこれまでの歩みと、これからの計画。
          </p>
        </header>

        <div className="space-y-12">
          {/* Section: Development Status */}
          <section>
             <h2 className="text-xl font-bold text-[#e67e22] mb-6 flex items-center gap-2 border-b-2 border-[#e67e22]/20 pb-2">
              <FaTools />
              <span>開発ロードマップ</span>
            </h2>

            <div className="relative border-l-2 border-dashed border-stone-300 ml-3 md:ml-6 space-y-10 pl-8 pb-4">
               {roadmapData.filter(i => i.status !== "done").map((item, index) => (
                 <div key={index} className="relative">
                    <div className={`absolute -left-[41px] md:-left-[53px] top-1 w-6 h-6 rounded-full border-4 bg-[#fcfbf9] z-10
                      ${item.status === 'developing' ? 'border-blue-400' : 'border-stone-300'}`}>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100 relative">
                       {item.status === 'developing' && (
                         <span className="absolute -top-3 right-4 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-bold">
                           開発中
                         </span>
                       )}
                       <h3 className="text-lg font-bold text-[#2c2c2c] mb-2 font-serif">{item.title}</h3>
                       <p className="text-stone-600 leading-relaxed text-sm">{item.description}</p>
                    </div>
                 </div>
               ))}
            </div>
          </section>

          {/* Section: Update History */}
          <section>
            <h2 className="text-xl font-bold text-[#2c2c2c] mb-6 flex items-center gap-2 border-b-2 border-stone-200 pb-2">
              <FaCheck className="text-green-600" />
              <span>更新履歴</span>
            </h2>

            <div className="relative border-l-2 border-stone-300 ml-3 md:ml-6 space-y-8 pl-8">
               {roadmapData.filter(i => i.status === "done").map((item, index) => (
                 <div key={index} className="relative">
                    <div className="absolute -left-[41px] md:-left-[53px] top-1 w-6 h-6 rounded-full border-4 border-green-500 bg-[#fcfbf9] z-10"></div>
                    <div>
                       <span className="text-sm font-bold text-stone-400 block mb-1 font-mono">{item.date}</span>
                       <h3 className="text-lg font-bold text-[#2c2c2c] mb-2 font-serif">{item.title}</h3>
                       <p className="text-stone-600 leading-relaxed text-sm">{item.description}</p>
                    </div>
                 </div>
               ))}
            </div>
          </section>

          <div className="mt-16 p-6 bg-stone-100 rounded-xl text-center">
            <p className="text-stone-600 text-sm mb-4">
              機能のご要望や不具合のご報告は、GitHub Issueまでお寄せください。
            </p>
             <a
               href="https://github.com/tomoki013/ai-travel-planner/issues"
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center gap-2 text-[#e67e22] font-bold hover:underline"
             >
               <FaFlag /> GitHub Issueを作成する
             </a>
          </div>

        </div>
      </main>
    </div>
  );
}
