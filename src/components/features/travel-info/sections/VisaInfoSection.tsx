'use client';

import { motion } from 'framer-motion';
import {
  FileCheck,
  FileX,
  Calendar,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import type { VisaInfo } from '@/types';
import type { SectionBaseProps } from '../types';

/**
 * VisaInfoSection - ビザ・入国手続き情報セクション
 *
 * ビザ要件、滞在可能日数、入国条件を表示
 */
export default function VisaInfoSection({ data }: SectionBaseProps<VisaInfo>) {
  return (
    <div className="space-y-6">
      {/* ビザ要否インジケーター */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`p-8 rounded-3xl border-2 border-dashed shadow-sm bg-[#fcfbf9] ${
          data.required
            ? 'border-orange-200'
            : 'border-green-200'
        }`}
      >
        <div className="flex items-center gap-6">
          <div
            className={`p-5 rounded-2xl shadow-sm border border-stone-100 ${
              data.required ? 'bg-orange-50' : 'bg-green-50'
            }`}
          >
            {data.required ? (
              <FileX className="w-10 h-10 text-orange-500" />
            ) : (
              <FileCheck className="w-10 h-10 text-green-500" />
            )}
          </div>
          <div className="flex-1">
            <p
              className={`font-serif font-bold text-2xl mb-1 ${
                data.required ? 'text-orange-800' : 'text-green-800'
              }`}
            >
              {data.required ? 'ビザが必要です' : 'ビザ不要'}
            </p>
            {!data.required && data.visaFreeStayDays && (
              <div className="flex items-center gap-2 text-green-700 font-medium font-serif">
                <Calendar className="w-4 h-4" />
                <span>
                  最大 <strong className="text-lg">{data.visaFreeStayDays}日間</strong>{' '}
                  ビザなしで滞在可能
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 入国要件 */}
      {data.requirements.length > 0 && (
        <div className="space-y-6">
          <h4 className="flex items-center gap-3 font-serif font-bold text-[#2c2c2c] text-lg">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CheckCircle className="w-4 h-4" />
            </span>
            入国要件
          </h4>
          <ul className="space-y-3">
            {data.requirements.map((requirement, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-5 bg-[#fcfbf9] border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors duration-200"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 rounded border-2 border-green-400 flex items-center justify-center bg-white text-green-500">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-stone-700 text-base leading-relaxed font-serif">
                  {requirement}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* 補足事項 */}
      {data.notes.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <Info className="w-5 h-5 text-primary" />
            補足事項
          </h4>
          <ul className="space-y-2">
            {data.notes.map((note, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-stone-700 text-sm leading-relaxed">
                  {note}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* 注意書き */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-sm text-amber-800">
          <strong>注意:</strong>{' '}
          ビザ要件は変更される場合があります。渡航前に必ず大使館・領事館の公式情報をご確認ください。
        </p>
      </div>
    </div>
  );
}
