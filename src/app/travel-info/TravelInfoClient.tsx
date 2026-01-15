// import { notFound } from "next/navigation";

// export default function TravelInfoPage() {
//   return notFound();
// }

"use client";

import { useState } from "react";
import {
  FaPassport,
  FaPlug,
  FaMoneyBillWave,
  FaShieldAlt,
  FaSearch,
  FaMapMarkedAlt,
  FaInfoCircle,
} from "react-icons/fa";
import { getLegacyTravelInfo } from "@/app/actions/travel-info";

interface TravelInfo {
  country: string;
  visa: string;
  power: {
    voltage: string;
    frequency: string;
    plugType: string;
  };
  tipping: string;
  safety: {
    overview: string;
    warnings: string[];
  };
  generalInfo: string;
}

export default function TravelInfoClient() {
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [travelInfo, setTravelInfo] = useState<TravelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!country.trim()) return;

    setLoading(true);
    setError(null);
    setTravelInfo(null);

    try {
      const result = await getLegacyTravelInfo(country.trim());
      if (result.success && result.data) {
        setTravelInfo(result.data);
      } else {
        setError(result.error || "情報の取得に失敗しました。");
      }
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9]">
      {/* Hero Section */}
      <section className="relative w-full">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center space-y-6">
            <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#2c2c2c] leading-tight">
              渡航情報・安全ガイド
            </h1>
            <p className="text-xl text-stone-600 font-hand max-w-3xl mx-auto leading-relaxed">
              渡航先の基本情報を一括チェック。
              <br className="hidden sm:block" />
              ビザ、電源、チップ、治安情報をまとめて確認できます。
            </p>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <main className="max-w-5xl mx-auto px-4 pb-16 sm:pb-24">
        <div className="space-y-12">
          {/* Search Form */}
          <section className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-8 sm:p-12 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="country"
                  className="block text-lg font-bold text-[#2c2c2c] mb-3 font-serif"
                >
                  国・地域名を入力してください
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="例: フランス、タイ、アメリカ"
                    className="flex-1 px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-primary transition-colors"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !country.trim()}
                    className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                  >
                    <FaSearch />
                    {loading ? "検索中..." : "検索"}
                  </button>
                </div>
              </div>
              <p className="text-sm text-stone-500 flex items-start gap-2">
                <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                <span>
                  AIが最新の一般的な情報を提供しますが、必ず公式サイト（外務省、大使館など）で最新情報をご確認ください。
                </span>
              </p>
            </form>
          </section>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-stone-600 font-hand text-lg">
                {country}の情報を取得中...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 border-dashed rounded-3xl p-8 text-center">
              <p className="text-red-800 font-bold">{error}</p>
            </div>
          )}

          {/* Results */}
          {travelInfo && !loading && (
            <div className="space-y-8">
              {/* Country Header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-3xl p-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <FaMapMarkedAlt className="text-3xl" />
                  <h2 className="text-3xl font-serif font-bold">
                    {travelInfo.country}
                  </h2>
                </div>
                <p className="text-white/90 font-hand">渡航情報</p>
              </div>

              {/* Info Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Visa Information */}
                <div className="bg-white rounded-2xl border-2 border-stone-200 p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <FaPassport className="text-blue-600 text-xl" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-[#2c2c2c]">
                      ビザ情報
                    </h3>
                  </div>
                  <div className="text-stone-700 leading-relaxed whitespace-pre-line">
                    {travelInfo.visa}
                  </div>
                </div>

                {/* Power Information */}
                <div className="bg-white rounded-2xl border-2 border-stone-200 p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <FaPlug className="text-yellow-600 text-xl" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-[#2c2c2c]">
                      電源・コンセント
                    </h3>
                  </div>
                  <div className="space-y-3 text-stone-700">
                    <div>
                      <span className="font-bold">電圧:</span>{" "}
                      {travelInfo.power.voltage}
                    </div>
                    <div>
                      <span className="font-bold">周波数:</span>{" "}
                      {travelInfo.power.frequency}
                    </div>
                    <div>
                      <span className="font-bold">プラグタイプ:</span>{" "}
                      {travelInfo.power.plugType}
                    </div>
                  </div>
                </div>

                {/* Tipping Information */}
                <div className="bg-white rounded-2xl border-2 border-stone-200 p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <FaMoneyBillWave className="text-green-600 text-xl" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-[#2c2c2c]">
                      チップの習慣
                    </h3>
                  </div>
                  <div className="text-stone-700 leading-relaxed whitespace-pre-line">
                    {travelInfo.tipping}
                  </div>
                </div>

                {/* Safety Information */}
                <div className="bg-white rounded-2xl border-2 border-stone-200 p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <FaShieldAlt className="text-red-600 text-xl" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-[#2c2c2c]">
                      治安情報
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="text-stone-700 leading-relaxed whitespace-pre-line">
                      {travelInfo.safety.overview}
                    </div>
                    {travelInfo.safety.warnings.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <p className="font-bold text-orange-800 mb-2">
                          ⚠️ 注意点:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-orange-900 text-sm">
                          {travelInfo.safety.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* General Information */}
              {travelInfo.generalInfo && (
                <div className="bg-gradient-to-br from-stone-50 to-primary/5 rounded-3xl border-2 border-dashed border-stone-200 p-8 sm:p-12">
                  <h3 className="text-2xl font-serif font-bold text-[#2c2c2c] mb-4">
                    その他の情報
                  </h3>
                  <div className="text-stone-700 leading-relaxed whitespace-pre-line">
                    {travelInfo.generalInfo}
                  </div>
                </div>
              )}

              {/* Important Notice */}
              <div className="bg-orange-50 border-2 border-orange-200 border-dashed rounded-3xl p-8">
                <h3 className="text-xl font-serif font-bold text-orange-800 mb-3">
                  ⚠️ 重要なお知らせ
                </h3>
                <div className="space-y-2 text-orange-900 text-sm leading-relaxed">
                  <p>
                    この情報はAIによって生成された一般的な情報です。
                    渡航前には必ず以下の公式情報源で最新情報をご確認ください：
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>
                      <a
                        href="https://www.mofa.go.jp/mofaj/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-orange-700 font-bold"
                      >
                        外務省 海外安全ホームページ
                      </a>
                    </li>
                    <li>各国の大使館・領事館の公式ウェブサイト</li>
                    <li>航空会社や旅行会社の最新情報</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* How to Use */}
          {!travelInfo && !loading && (
            <section className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-8 sm:p-12 shadow-sm">
              <h2 className="text-3xl font-serif font-bold text-[#e67e22] mb-6 text-center">
                このページでできること
              </h2>
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-primary font-bold">✓</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2c2c2c] mb-1">
                        ビザの要否
                      </h3>
                      <p className="text-stone-600 text-sm">
                        日本国籍の場合のビザ免除や取得方法
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-primary font-bold">✓</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2c2c2c] mb-1">
                        電源形状
                      </h3>
                      <p className="text-stone-600 text-sm">
                        電圧、周波数、プラグタイプの確認
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-primary font-bold">✓</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2c2c2c] mb-1">
                        チップ文化
                      </h3>
                      <p className="text-stone-600 text-sm">
                        その国のチップの習慣や相場
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-primary font-bold">✓</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2c2c2c] mb-1">
                        治安情報
                      </h3>
                      <p className="text-stone-600 text-sm">
                        一般的な治安状況と注意点
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-blue-900 text-sm text-center">
                  <strong>💡 便利ポイント:</strong>{" "}
                  いろいろなサイトを検索しなくても、必要な情報を一括で確認できます！
                </p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
