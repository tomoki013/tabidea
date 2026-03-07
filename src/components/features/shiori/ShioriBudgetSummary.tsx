'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { updatePlanOverallBudget } from '@/app/actions/shiori-edit';

interface ShioriBudgetSummaryProps {
  overallBudget: number | null;
  overallBudgetCurrency: string;
  estimatedTotal: number;
  actualTotal: number;
  isOwner: boolean;
  slug: string;
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null || amount === 0) return '-';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ShioriBudgetSummary({
  overallBudget,
  overallBudgetCurrency,
  estimatedTotal,
  actualTotal,
  isOwner,
  slug,
}: ShioriBudgetSummaryProps) {
  const t = useTranslations('pages.shiori.detail');
  const [isEditing, setIsEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState(overallBudget?.toString() ?? '');
  const [currencyInput, setCurrencyInput] = useState(overallBudgetCurrency);
  const [currentBudget, setCurrentBudget] = useState(overallBudget);
  const [currentCurrency, setCurrentCurrency] = useState(overallBudgetCurrency);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const parsed = budgetInput.trim() ? parseFloat(budgetInput) : null;
    const result = await updatePlanOverallBudget(slug, parsed, currencyInput);
    setIsSaving(false);
    if (result.success) {
      setCurrentBudget(parsed);
      setCurrentCurrency(currencyInput);
      setIsEditing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-dashed border-stone-200 dark:border-stone-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
          {t('budgetSummaryTitle')}
        </h2>
        {isOwner && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {t('editBudget')}
          </button>
        )}
      </div>

      <div className="px-6 py-4">
        {isEditing ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600 dark:text-stone-400">
              {t('overallBudget')}
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="0"
                className="rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-3 py-2 text-sm text-stone-800 dark:text-stone-200 w-40"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600 dark:text-stone-400">
              {t('budgetCurrency')}
              <input
                type="text"
                value={currencyInput}
                onChange={(e) => setCurrencyInput(e.target.value.toUpperCase())}
                maxLength={3}
                className="rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-3 py-2 text-sm text-stone-800 dark:text-stone-200 w-20"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving ? '...' : t('save')}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-full border border-stone-300 dark:border-stone-600 px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className={`grid gap-4 ${currentBudget ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {currentBudget && (
              <div className="flex flex-col items-center rounded-xl border border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 p-4 text-center">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                  {t('overallBudget')}
                </span>
                <span className="text-lg font-bold text-primary">
                  {formatAmount(currentBudget, currentCurrency)}
                </span>
              </div>
            )}
            <div className="flex flex-col items-center rounded-xl border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-700/50 p-4 text-center">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                {t('estimatedTotal')}
              </span>
              <span className="text-lg font-bold text-stone-800 dark:text-stone-200">
                {formatAmount(estimatedTotal || null, currentCurrency)}
              </span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-700/50 p-4 text-center">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                {t('actualTotal')}
              </span>
              <span className="text-lg font-bold text-stone-800 dark:text-stone-200">
                {formatAmount(actualTotal || null, currentCurrency)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
