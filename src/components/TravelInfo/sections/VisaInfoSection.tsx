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
import type { VisaInfo } from '@/lib/types/travel-info';
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
        className={`p-5 sm:p-6 rounded-2xl border bg-white shadow-md ${
          data.required
            ? 'border-orange-200'
            : 'border-green-200'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-4 rounded-xl ${
              data.required ? 'bg-orange-100' : 'bg-green-100'
            }`}
          >
            {data.required ? (
              <FileX className="w-8 h-8 text-orange-600" />
            ) : (
              <FileCheck className="w-8 h-8 text-green-600" />
            )}
          </div>
          <div>
            <p
              className={`font-bold text-lg ${
                data.required ? 'text-orange-800' : 'text-green-800'
              }`}
            >
              {data.required ? 'ビザが必要です' : 'ビザ不要'}
            </p>
            {!data.required && data.visaFreeStayDays && (
              <div className="flex items-center gap-2 mt-1 text-green-700">
                <Calendar className="w-4 h-4" />
                <span>
                  最大 <strong>{data.visaFreeStayDays}日間</strong>{' '}
                  ビザなしで滞在可能
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 入国要件 */}
      {data.requirements.length > 0 && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c] text-lg">
            <CheckCircle className="w-6 h-6 text-primary" />
            入国要件
          </h4>
          <ul className="space-y-3">
            {data.requirements.map((requirement, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 bg-white border border-stone-100 rounded-xl shadow-sm"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-stone-800 text-base leading-relaxed">
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
