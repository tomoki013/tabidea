'use client';

import { motion } from 'framer-motion';
import {
  Train,
  Bus,
  Smartphone,
  Car,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import type { TransportInfo } from '@/types';
import type { SectionBaseProps } from '../types';

/**
 * TransportInfoSection - 交通情報セクション
 *
 * 公共交通、ライドシェア、運転に関する情報を表示
 */
export default function TransportInfoSection({ data }: SectionBaseProps<TransportInfo>) {
  return (
    <div className="space-y-8">
      {/* 公共交通機関 */}
      {data.publicTransport.length > 0 && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c] text-lg">
            <Train className="w-6 h-6 text-primary" />
            公共交通機関
          </h4>
          <ul className="space-y-3">
            {data.publicTransport.map((transport, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 bg-white border border-stone-100 rounded-xl shadow-sm"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Bus className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-stone-800 text-base leading-relaxed">
                  {transport}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* ライドシェア情報 */}
      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c] text-lg">
          <Smartphone className="w-6 h-6 text-primary" />
          配車サービス
        </h4>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`p-5 sm:p-6 rounded-2xl border bg-white shadow-md ${
            data.rideshare.available
              ? 'border-green-200'
              : 'border-stone-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            {data.rideshare.available ? (
              <>
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="font-bold text-green-800 text-lg">
                  配車サービス利用可能
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-stone-400" />
                <span className="font-bold text-stone-600 text-lg">
                  配車サービス利用不可または限定的
                </span>
              </>
            )}
          </div>

          {data.rideshare.available && data.rideshare.services.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.rideshare.services.map((service, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm text-green-800 font-bold"
                >
                  <Smartphone className="w-4 h-4" />
                  {service}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* 運転に関する注意事項 */}
      {data.drivingNotes && data.drivingNotes.length > 0 && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c] text-lg">
            <Car className="w-6 h-6 text-primary" />
            運転に関する注意事項
          </h4>
          <ul className="space-y-3">
            {data.drivingNotes.map((note, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 bg-white border border-amber-100 rounded-xl shadow-sm"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-stone-800 text-base leading-relaxed">
                  {note}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
