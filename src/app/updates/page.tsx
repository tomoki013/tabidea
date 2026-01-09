import type { Metadata } from "next";
import { FaFlag, FaCheck, FaTools } from "react-icons/fa";

export const metadata: Metadata = {
  title: "更新情報・ロードマップ - Tabidea",
  description: "Tabideaの更新情報と今後の開発ロードマップを掲載しています。",
};

type RoadmapItem = {
  status: "done" | "planned" | "developing";
  date?: string; // For done items
  title: string;
  description: string;
};

const roadmapData: RoadmapItem[] = [
  {
    status: "planned",
    title: "プランの保存機能",
    description:
      "生成した旅行プランをブラウザに保存し、後から確認できる機能を開発中です。",
  },
  {
    status: "planned",
    title: "プランの画像共有",
    description:
      "旅行プランを綺麗な画像として書き出し、SNSでシェアしやすくする機能を検討しています。",
  },
  {
    status: "developing",
    title: "ユーザーアカウント機能",
    description:
      "ログインすることで、複数のデバイスでプランを同期したり、過去の履歴を管理できるようになります。",
  },
  {
    status: "planned",
    title: "PDF出力",
    description: "生成されたプランをPDFで出力できるようになります。",
  },
  {
    status: "planned",
    title: "日程の並び替えや時間の調整",
    description: "日程の並び替えや時間の調整ができる機能を開発中です。",
  },
  {
    status: "planned",
    title: "複数の候補からプランを選択できる機能",
    description: "複数の候補からプランを選択できる機能を開発中です。",
  },
  {
    status: "planned",
    title: "ホテル、飛行機を含めたプラン提案",
    description: "ホテル、飛行機を含めたプランを提案する機能を検討しています。",
  },
  {
    status: "done",
    date: "2025.01.08", // Approximate date based on context
    title: "よくある質問および機能紹介・使い方ページを設置",
    description:
      "よくある質問ページと使い方ページを設置し、多くの人が利用しやすいサービスとするための改修を行いました。",
  },
  {
    status: "done",
    date: "2025.12.23", // Approximate date based on context
    title: "β版サービス公開",
    description:
      "UIとUXの修正、および本格的なサービス開始に伴うページ整理を行いました。",
  },
  {
    status: "done",
    date: "2025.12.13", // Approximate date based on context
    title: "α版サービス公開",
    description:
      "Tabideaのα版を公開しました。Gemini AIを活用した旅行プラン生成が可能です。",
  },
];

// 1. 優先順位を定義するオブジェクトを作る (数値が小さいほうが先頭)
const statusPriority: Record<RoadmapItem["status"], number> = {
  developing: 1, // 先頭にしたい
  planned: 2,
  done: 3,
};

// 2. その数値を使って引き算でソートする
const sorted = roadmapData.toSorted((a, b) => {
  return statusPriority[a.status] - statusPriority[b.status];
});

export default function UpdatesPage() {
  return (
    <div className="min-h-screen p-8 sm:p-20 font-sans">
      <main className="max-w-3xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2c2c2c] mb-4">
            Updates & Roadmap
          </h1>
          <p className="text-stone-600 font-hand text-lg">
            Tabideaのこれまでの歩みと、これからの計画。
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
              {sorted
                .filter((i) => i.status !== "done")
                .map((item, index) => (
                  <div key={index} className="relative">
                    <div
                      className={`absolute -left-[41px] md:-left-[53px] top-1 w-6 h-6 rounded-full border-4 bg-[#fcfbf9] z-10
                      ${
                        item.status === "developing"
                          ? "border-blue-400"
                          : "border-stone-300"
                      }`}
                    ></div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100 relative">
                      {item.status === "developing" && (
                        <span className="absolute -top-3 right-4 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-bold">
                          開発中
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-[#2c2c2c] mb-2 font-serif">
                        {item.title}
                      </h3>
                      <p className="text-stone-600 leading-relaxed text-sm">
                        {item.description}
                      </p>
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
              {roadmapData
                .filter((i) => i.status === "done")
                .map((item, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-[41px] md:-left-[53px] top-1 w-6 h-6 rounded-full border-4 border-green-500 bg-[#fcfbf9] z-10"></div>
                    <div>
                      <span className="text-sm font-bold text-stone-400 block mb-1 font-mono">
                        {item.date}
                      </span>
                      <h3 className="text-lg font-bold text-[#2c2c2c] mb-2 font-serif">
                        {item.title}
                      </h3>
                      <p className="text-stone-600 leading-relaxed text-sm">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          <div className="mt-16 bg-stone-50 rounded-xl border border-stone-200 p-8">
            <h3 className="text-center font-bold text-lg text-[#2c2c2c] mb-6 font-serif">
              ご意見・お問い合わせ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/contact"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-stone-200 hover:border-[#e67e22] hover:shadow-sm transition-all group"
              >
                <span className="font-bold text-[#2c2c2c] group-hover:text-[#e67e22] mb-2">
                  お問い合わせ
                </span>
                <span className="text-xs text-stone-500 text-center">
                  一般的なご質問やご感想はこちら
                </span>
              </a>
              <a
                href="https://github.com/tomoki013/ai-travel-planner/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-stone-200 hover:border-[#e67e22] hover:shadow-sm transition-all group"
              >
                <span className="flex items-center gap-2 font-bold text-[#2c2c2c] group-hover:text-[#e67e22] mb-2">
                  <FaFlag size={14} /> 不具合報告・要望
                </span>
                <span className="text-xs text-stone-500 text-center">
                  GitHub Issueにて受け付けています
                </span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
