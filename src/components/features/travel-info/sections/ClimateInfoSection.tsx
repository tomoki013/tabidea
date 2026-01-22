'use client';

import { motion } from 'framer-motion';
import {
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  Droplets,
  Thermometer,
  Shirt,
} from 'lucide-react';
import type { ClimateInfo, WeatherForecast } from '@/types';
import type { SectionBaseProps } from '../types';

/**
 * 天気アイコンコンポーネント
 * 天気条件に応じたアイコンを表示
 */
function WeatherIconDisplay({ condition, className }: { condition: string; className?: string }) {
  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('晴') || lowerCondition.includes('sunny') || lowerCondition.includes('clear')) {
    return <Sun className={className} />;
  }
  if (lowerCondition.includes('雨') || lowerCondition.includes('rain')) {
    return <CloudRain className={className} />;
  }
  if (lowerCondition.includes('雪') || lowerCondition.includes('snow')) {
    return <Snowflake className={className} />;
  }
  return <Cloud className={className} />;
}

/**
 * ClimateInfoSection - 気候・服装情報セクション
 *
 * 現在の天気、予報、服装アドバイスを表示
 */
export default function ClimateInfoSection({ data }: SectionBaseProps<ClimateInfo>) {
  return (
    <div className="space-y-6">
      {/* 現在の天気 */}
      {data.currentWeather && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-[#fcfbf9] rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12" />

          <h4 className="text-sm text-stone-500 mb-4 font-bold font-serif uppercase tracking-wider">Current Weather</h4>
          <div className="flex items-center gap-8 relative z-10">
            <div className="text-primary/80">
              <WeatherIconDisplay condition={data.currentWeather.condition} className="w-20 h-20" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-serif font-bold text-[#2c2c2c]">
                  {Math.round(data.currentWeather.temp)}
                </span>
                <span className="text-2xl text-stone-400 font-serif">°C</span>
              </div>
              <p className="text-lg text-stone-600 mt-2 font-serif font-bold">
                {data.currentWeather.condition}
              </p>
            </div>
            <div className="ml-auto flex flex-col items-end gap-1 text-stone-500">
              <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-stone-100 shadow-sm">
                <Droplets className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold">{data.currentWeather.humidity}%</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 天気予報 */}
      {data.forecast && data.forecast.length > 0 && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c] text-lg">
            <Thermometer className="w-5 h-5 text-primary" />
            天気予報
          </h4>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-4">
            <div className="flex gap-4 min-w-max">
              {data.forecast.map((forecast, index) => (
                <ForecastCard key={forecast.date} forecast={forecast} index={index} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 季節の説明 */}
      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c] text-lg">
          <Wind className="w-5 h-5 text-primary" />
          季節の特徴
        </h4>
        <div className="p-6 bg-[#fcfbf9] border border-stone-200 rounded-xl shadow-sm relative">
           <div className="absolute top-4 left-4 w-8 h-1 bg-primary/20" />
           <p className="text-stone-700 leading-loose font-serif pt-4">
            {data.seasonDescription}
           </p>
        </div>
      </div>

      {/* 服装アドバイス */}
      {data.recommendedClothing.length > 0 && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c] text-lg">
            <Shirt className="w-5 h-5 text-primary" />
            服装アドバイス
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.recommendedClothing.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-4 p-4 bg-white border border-stone-100 rounded-xl shadow-sm hover:border-primary/20 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 font-serif">
                  {index + 1}
                </div>
                <p className="text-stone-700 text-sm font-medium leading-relaxed">{item}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 予報カード
 */
function ForecastCard({
  forecast,
  index,
}: {
  forecast: WeatherForecast;
  index: number;
}) {
  const date = new Date(forecast.date);
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex flex-col items-center gap-2 p-4 bg-white border border-stone-100 rounded-xl min-w-[110px] shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
    >
      {/* 日付 */}
      <div className="text-center">
        <p
          className={`text-sm font-medium ${
            isWeekend ? 'text-red-500' : 'text-stone-600'
          }`}
        >
          {date.getMonth() + 1}/{date.getDate()}
        </p>
        <p
          className={`text-xs ${
            isWeekend ? 'text-red-400' : 'text-stone-400'
          }`}
        >
          ({dayOfWeek})
        </p>
      </div>

      {/* 天気アイコン */}
      <WeatherIconDisplay condition={forecast.condition} className="w-10 h-10 text-blue-400" />

      {/* 気温 */}
      <div className="text-center">
        <p className="text-lg font-bold text-red-500">
          {Math.round(forecast.high)}°
        </p>
        <p className="text-sm text-blue-500">
          {Math.round(forecast.low)}°
        </p>
      </div>

      {/* 天気状態 */}
      <p className="text-xs text-stone-500 text-center">
        {forecast.condition}
      </p>
    </motion.div>
  );
}
