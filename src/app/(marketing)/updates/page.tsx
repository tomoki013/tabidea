import type { Metadata } from "next";
import { FaFlag, FaCheck, FaTools } from "react-icons/fa";

export const metadata: Metadata = {
  title: "更新情報・ロードマップ",
  description: "Tabideaの更新情報と今後の開発ロードマップを掲載しています。",
};

type UpdateType = "release" | "pre_release" | "patch" | "minor" | "major";

type RoadmapItem = {
  status: "done" | "planned" | "developing";
  date?: string; // For done items
  updateType?: UpdateType;
  title: string;
  description: string;
};

// Chronological order (Oldest -> Newest)
// This enables dynamic version calculation from a base of 0.0.0
const rawRoadmapData: RoadmapItem[] = [
  {
    status: "done",
    date: "2025.12.13",
    updateType: "pre_release",
    title: "α版サービス公開",
    description:
      "Tabideaのα版を公開しました。Gemini AIを活用した旅行プラン生成が可能です。",
  },
  {
    status: "done",
    date: "2025.12.23",
    updateType: "pre_release",
    title: "β版サービス公開",
    description:
      "UIとUXの修正、および本格的なサービス開始に伴うページ整理を行いました。",
  },
  {
    status: "done",
    date: "2025.01.08",
    updateType: "patch",
    title: "よくある質問および機能紹介・使い方ページを設置",
    description:
      "よくある質問ページと使い方ページを設置し、多くの人が利用しやすいサービスとするための改修を行いました。",
  },
  {
    status: "done",
    date: "2026.01.09",
    updateType: "patch",
    title: "プラン生成精度の向上",
    description:
      "AIによるプラン生成の精度を向上させました。より具体的で実現性の高いプランが提案されるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.10",
    updateType: "patch",
    title: "日程が長い場合のスケジュール生成改善",
    description:
      "日程が長くなると1日あたりの予定が少なくなる問題を修正しました。",
  },
  {
    status: "done",
    date: "2026.01.10",
    updateType: "patch",
    title: "PDF出力機能の実装",
    description:
      "生成された旅行プランをPDF形式でダウンロードできるようになりました。オフラインでの閲覧や印刷に便利です。",
  },
  {
    status: "done",
    date: "2026.01.11",
    updateType: "patch",
    title: "プランの手動修正機能",
    description: "プラン生成後に手動でプランの修正ができるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.13",
    updateType: "patch",
    title: "旅程サンプル集の公開",
    description:
      "様々な旅行プランのサンプルを閲覧できる旅程サンプル集を公開しました。プラン作成の参考にご活用ください。",
  },
  {
    status: "done",
    date: "2026.01.14",
    updateType: "patch",
    title: "サンプルの大幅追加と検索・絞り込み機能の実装",
    description:
      "旅程サンプルを大幅に追加し、地域やキーワードでプランを探せる検索・絞り込み機能を実装しました。よりスムーズに理想の旅程を見つけられるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.14",
    updateType: "patch",
    title: "日程の並び替えや時間の調整",
    description: "日程の並び替えや時間の調整ができるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.15",
    updateType: "minor",
    title: "渡航情報のAI検索機能を追加",
    description:
      "渡航情報・安全ガイド詳細ページにて、AIが最新の渡航情報を調べてくれる機能を追加しました。より詳細でリアルタイムな情報を確認できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.16",
    updateType: "patch",
    title: "渡航情報のAI検索機能の精度向上とカテゴリー追加",
    description:
      "AIによる情報の検索精度を改善しました。また、より多角的な情報を取得できるよう、検索可能なカテゴリーを追加しました。",
  },
  {
    status: "done",
    date: "2026.01.16",
    updateType: "patch",
    title: "渡航情報のPDF出力機能",
    description:
      "渡航情報をPDFとしてダウンロードできる機能を追加しました。オフラインでの閲覧や印刷に便利です。",
  },
  {
    status: "done",
    date: "2026.01.17",
    updateType: "patch",
    title: "渡航情報・安全ガイドで、外部APIを使用",
    description:
      "渡航情報・安全ガイドで、外部APIを使用して情報を取得するようになりました。より正確でリアルタイムな情報を確認できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.19",
    updateType: "patch",
    title: "ブランドイメージとTabideaへの想いをTabideaについてページに追加",
    description:
      "ブランドイメージとTabideaへの想いをTabideaについてページに追加しました。",
  },
  {
    status: "done",
    date: "2026.01.19",
    updateType: "patch",
    title: "渡航情報・安全ガイドのカテゴリを追加",
    description:
      "渡航情報・安全ガイドのカテゴリを追加しました。より多くの情報を検索できます。",
  },
  {
    status: "done",
    date: "2026.01.20",
    updateType: "patch",
    title: "ブランドイメージに合わせて一部ページのUIを修正",
    description: "ブランドイメージに合わせて一部ページのUIを修正しました。",
  },
  {
    status: "done",
    date: "2026.01.21",
    updateType: "patch",
    title:
      "旅程生成後のチャットでよく使われる文章をボタン一つで追加できるように",
    description:
      "旅程生成後のチャットでよく使われる文章をボタン一つで追加できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.22",
    updateType: "patch",
    title: "渡航情報・安全ガイドのデザインを更新",
    description:
      "渡航情報・安全ガイドのデザインを更新し、見やすくてすぐに理解できるような見た目にしました。",
  },
  {
    status: "done",
    date: "2026.01.23",
    updateType: "patch",
    title: "複数地域を周遊する旅程プラン生成に対応",
    description: "複数地域を周遊する旅程プランを生成できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.23",
    updateType: "patch",
    title: "プランページで渡航情報・安全ガイドを確認できるように",
    description:
      "プランページで生成された旅程の地域の渡航情報・安全ガイドをボタン一つで確認できるようにしました。",
  },
  {
    status: "done",
    date: "2026.01.26",
    updateType: "minor",
    title: "ユーザーアカウント機能",
    description:
      "ログインすることで、複数のデバイスでプランを同期したり、過去の履歴を管理できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.26",
    updateType: "patch",
    title: "プランの保存機能",
    description:
      "生成した旅行プランを保存し、後から確認できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.27",
    updateType: "patch",
    title: "ユーザーアカウント機能の追加に伴う法務関連文書の更新",
    description:
      "ユーザーアカウント機能の追加に伴い、利用規約およびプライバシーポリシーを改定しました。",
  },
  // Future items
  {
    status: "developing",
    title: "持ち物リストの作成",
    description:
      "旅行の目的地や期間に合わせて、必要な持ち物リストを自動で作成・管理できる機能を開発しています。",
  },
  {
    status: "planned",
    title: "予算を詳細に制御する機能",
    description:
      "宿泊費や交通費などの項目ごとに予算を細かく設定し、全体の費用をより正確にシミュレーション・管理できる機能を計画しています。",
  },
  {
    status: "planned",
    title: "プランの画像共有",
    description:
      "旅行プランを綺麗な画像として書き出し、SNSでシェアしやすくする機能を検討しています。",
  },
  {
    status: "planned",
    title: "旅行中のメモ機能",
    description:
      "旅行中に何を食べたかやどこが良かったかを生成されたプランに直接書き込める機能を計画しています。",
  },
  {
    status: "developing",
    title: "AI生成設定の保存",
    description:
      "ユーザーごとに、AI生成時に常に考慮してほしい要望（例：安さ重視、ゆったり等）を設定・保存できる機能を開発中です。",
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
    status: "planned",
    title: "ダークモード対応",
    description: "目に優しいダークモードへの対応を計画しています。",
  },
  {
    status: "planned",
    title: "多言語対応",
    description:
      "日本語以外の言語でもサービスを利用できるよう、多言語対応を計画しています。",
  },
];

// Helper to calculate versions
type RoadmapItemWithVersion = RoadmapItem & { version?: string };

function calculateVersions(items: RoadmapItem[]): RoadmapItemWithVersion[] {
  let major = 0;
  let minor = 0;
  let patch = 0;

  return items.map((item) => {
    if (item.status !== "done") return item;

    if (item.updateType === "release" || item.updateType === "major") {
      major += 1;
      minor = 0;
      patch = 0;
    } else if (
      item.updateType === "pre_release" ||
      item.updateType === "minor"
    ) {
      minor += 1;
      patch = 0;
    } else if (item.updateType === "patch") {
      patch += 1;
    }

    return {
      ...item,
      version: `${major}.${minor}.${patch}`,
    };
  });
}

const roadmapData = calculateVersions(rawRoadmapData);

// 1. 優先順位を定義するオブジェクトを作る (数値が小さいほうが先頭)
const statusPriority: Record<RoadmapItem["status"], number> = {
  developing: 1, // 先頭にしたい
  planned: 2,
  done: 3,
};

// 2. その数値を使って引き算でソートする
// Note: We use the raw data logic for Roadmap section (future items),
// but typically we just filter the computed 'roadmapData' too.
const sortedRoadmap = roadmapData.toSorted((a, b) => {
  return statusPriority[a.status] - statusPriority[b.status];
});

// For history, we want Newest -> Oldest
const historyItems = roadmapData
  .filter((i) => i.status === "done")
  .toReversed();

export default function UpdatesPage() {
  return (
    <div className="min-h-screen pt-32 pb-20 px-8 sm:px-20 font-sans">
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
              {sortedRoadmap
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
              {historyItems.map((item, index) => (
                <div key={index} className="relative">
                  <div className="absolute -left-[41px] md:-left-[53px] top-1 w-6 h-6 rounded-full border-4 border-green-500 bg-[#fcfbf9] z-10"></div>
                  <div>
                    <span className="text-sm font-bold text-stone-400 block mb-1 font-mono flex items-center gap-2 flex-wrap">
                      {item.date}
                      {item.version && (
                        <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-xs">
                          v{item.version}
                        </span>
                      )}
                      {item.updateType && (
                        <span
                          className={`px-2 py-0.5 rounded text-xs border ${
                            item.updateType === "release"
                              ? "bg-orange-50 text-red-600 border-orange-200"
                              : item.updateType === "pre_release"
                                ? "bg-blue-50 text-blue-600 border-blue-200"
                                : item.updateType === "major"
                                  ? "bg-red-50 text-orange-600 border-red-200"
                                  : item.updateType === "minor"
                                    ? "bg-green-50 text-green-600 border-green-200"
                                    : "bg-stone-50 text-stone-500 border-stone-200"
                          }`}
                        >
                          {item.updateType === "release"
                            ? "Release"
                            : item.updateType === "pre_release"
                              ? "Pre-release"
                              : item.updateType === "major"
                                ? "Major"
                                : item.updateType === "minor"
                                  ? "Minor"
                                  : "Patch"}
                        </span>
                      )}
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
