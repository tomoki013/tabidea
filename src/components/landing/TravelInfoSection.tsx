"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FaGlobeAsia,
  FaClock,
  FaMoneyBillWave,
  FaShieldAlt,
  FaExternalLinkAlt,
  FaExclamationTriangle,
  FaArrowRight,
} from "react-icons/fa";

interface Destination {
  id: string;
  name: string;
  zone: string;
  currency: string;
  flag: string;
}

const destinations: Destination[] = [
  {
    id: "us",
    name: "アメリカ (NYC)",
    zone: "America/New_York",
    currency: "USD",
    flag: "🇺🇸",
  },
  {
    id: "hi",
    name: "ハワイ",
    zone: "Pacific/Honolulu",
    currency: "USD",
    flag: "🌺",
  },
  {
    id: "fr",
    name: "フランス",
    zone: "Europe/Paris",
    currency: "EUR",
    flag: "🇫🇷",
  },
  {
    id: "uk",
    name: "イギリス",
    zone: "Europe/London",
    currency: "GBP",
    flag: "🇬🇧",
  },
  { id: "kr", name: "韓国", zone: "Asia/Seoul", currency: "KRW", flag: "🇰🇷" },
  { id: "tw", name: "台湾", zone: "Asia/Taipei", currency: "TWD", flag: "🇹🇼" },
  { id: "th", name: "タイ", zone: "Asia/Bangkok", currency: "THB", flag: "🇹🇭" },
  {
    id: "au",
    name: "オーストラリア",
    zone: "Australia/Sydney",
    currency: "AUD",
    flag: "🇦🇺",
  },
];

export default function TravelInfoSection() {
  const [selectedDest, setSelectedDest] = useState<Destination>(
    destinations[0]
  );
  const [timeStr, setTimeStr] = useState<string>("");
  const [rate, setRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);

  // Clock Update
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const str = now.toLocaleTimeString("ja-JP", {
          timeZone: selectedDest.zone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setTimeStr(str);
      } catch (e) {
        setTimeStr("--:--:--");
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [selectedDest]);

  // Currency Fetch
  useEffect(() => {
    const fetchRate = async () => {
      if (selectedDest.currency === "JPY") {
        setRate(1);
        return;
      }
      setLoadingRate(true);
      try {
        // Using a free API for demo purposes.
        // In prod, use a better endpoint or backend proxy.
        const res = await fetch(
          `https://api.exchangerate-api.com/v4/latest/JPY`
        );
        const data = await res.json();
        // data.rates is relative to JPY base? No, usually base is USD or EUR for free tier.
        // Let's check the URL. If base is JPY: 1 JPY = X Target.
        // We usually want 1 Target = Y JPY.
        // So we want (1 / rates[Target]) if base is JPY.

        // Let's try fetching base=JPY if possible, or calculate from base=USD.
        // Actually, let's use base=USD as it's common.
        // Or just use the one provided in the comment: api.exchangerate-api.com/v4/latest/USD
        // Let's try to get JPY rate directly if the API supports base.

        // Better: Fetch rates for the target currency against JPY.
        // URL: https://api.exchangerate-api.com/v4/latest/${selectedDest.currency}

        const res2 = await fetch(
          `https://api.exchangerate-api.com/v4/latest/${selectedDest.currency}`
        );
        if (!res2.ok) throw new Error("Failed to fetch");

        const data2 = await res2.json();
        const jpyRate = data2.rates.JPY;
        setRate(jpyRate);
      } catch (e) {
        console.error("Currency fetch failed", e);
        setRate(null);
      } finally {
        setLoadingRate(false);
      }
    };
    fetchRate();
  }, [selectedDest]);

  return (
    <section className="w-full py-20 bg-orange-50/30 border-t border-stone-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center gap-2 mb-4 text-orange-600 font-bold tracking-widest text-sm uppercase"
          >
            <FaShieldAlt />
            <span>Travel Support</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-serif font-bold text-stone-800"
          >
            渡航情報・安全ガイド
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-stone-600 font-hand"
          >
            安心して旅を楽しむための、便利なツールと情報リンク集。
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tool Card: Time & Currency */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="col-span-1 lg:col-span-2 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border-2 border-dashed border-stone-200"
          >
            <h3 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
              <FaGlobeAsia className="text-primary" />
              <span>現地情報の確認</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-8">
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-bold text-stone-400 mb-2 uppercase tracking-wider">
                  Destination
                </label>
                <select
                  className="w-full sm:w-64 p-3 bg-stone-50 border border-stone-200 rounded-lg font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={selectedDest.id}
                  onChange={(e) => {
                    const d = destinations.find((x) => x.id === e.target.value);
                    if (d) setSelectedDest(d);
                  }}
                >
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.flag} {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Clock */}
              <div className="bg-stone-50 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-primary text-xl">
                  <FaClock />
                </div>
                <div>
                  <div className="text-xs text-stone-500 font-bold mb-1">
                    LOCAL TIME
                  </div>
                  <div className="text-2xl font-mono text-stone-800 tracking-wider">
                    {timeStr}
                  </div>
                </div>
              </div>

              {/* Currency */}
              <div className="bg-stone-50 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-green-600 text-xl">
                  <FaMoneyBillWave />
                </div>
                <div>
                  <div className="text-xs text-stone-500 font-bold mb-1">
                    CURRENCY ({selectedDest.currency})
                  </div>
                  <div className="text-xl font-mono text-stone-800 tracking-wider">
                    {loadingRate ? (
                      <span className="animate-pulse">...</span>
                    ) : rate ? (
                      <>
                        <span className="text-sm text-stone-400 mr-2">
                          1 {selectedDest.currency} =
                        </span>
                        {rate.toFixed(2)}{" "}
                        <span className="text-sm text-stone-600">JPY</span>
                      </>
                    ) : (
                      <span className="text-sm text-red-400">取得失敗</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Link Card: Safety */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-100 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                <FaExclamationTriangle className="text-orange-500" />
                <span>公式情報リンク</span>
              </h3>
              <p className="text-sm text-stone-500 mb-6 leading-relaxed">
                安全な旅のために、渡航前には必ず外務省の最新情報を確認しましょう。
              </p>
            </div>

            <div className="space-y-3">
              <a
                href="https://www.anzen.mofa.go.jp"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full p-4 bg-stone-50 hover:bg-orange-50 border border-stone-200 rounded-lg transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-700 group-hover:text-primary transition-colors">
                    外務省 海外安全HP
                  </span>
                  <FaExternalLinkAlt className="text-xs text-stone-400" />
                </div>
                <div className="text-xs text-stone-400 mt-1">
                  国別の治安情勢を確認
                </div>
              </a>

              <a
                href="https://www.ezairyu.mofa.go.jp/tabireg/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full p-4 bg-stone-50 hover:bg-orange-50 border border-stone-200 rounded-lg transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-700 group-hover:text-primary transition-colors">
                    たびレジ
                  </span>
                  <FaExternalLinkAlt className="text-xs text-stone-400" />
                </div>
                <div className="text-xs text-stone-400 mt-1">
                  最新の安全情報を受信
                </div>
              </a>
            </div>
          </motion.div>

          {/* CTA Card: Travel Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col justify-between h-full"
          >
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 sm:p-8 shadow-sm text-white h-full flex flex-col justify-center items-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
                <FaShieldAlt className="text-3xl" />
              </div>

              <h3 className="text-xl font-bold font-serif mb-4">
                もっと詳しく見る
              </h3>

              <p className="text-orange-100 text-sm mb-8 leading-relaxed font-hand">
                渡航情報や安全ガイドの
                <br />
                すべての機能を確認できます。
                <br />
                安心・安全な旅の準備をサポート。
              </p>

              <Link
                href="/travel-info"
                className="inline-flex items-center gap-2 bg-white text-orange-600 px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:bg-orange-50 transition-all transform hover:-translate-y-0.5"
              >
                <span>渡航情報を見る</span>
                <FaArrowRight className="text-sm" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
