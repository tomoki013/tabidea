/**
 * レビュー用Zodスキーマ
 * Cross-Review戦略でAIがレビュー結果を構造化して返すためのスキーマ
 */

import { z } from 'zod';

export const ReviewIssueSchema = z.object({
  /** 対象日（指定可能な場合） */
  day: z.number().optional().describe('問題のある日番号'),
  /** 問題カテゴリ */
  category: z.enum(['geographic', 'timing', 'quality', 'accuracy', 'diversity']).describe('問題の種類'),
  /** 重要度 */
  severity: z.enum(['critical', 'major', 'minor']).describe('問題の重要度'),
  /** 問題の説明 */
  description: z.string().describe('問題の詳細説明（日本語）'),
  /** 改善提案 */
  suggestion: z.string().describe('具体的な改善提案（日本語）'),
});

export const ReviewResultSchema = z.object({
  /** 全体スコア (0-100) */
  overallScore: z.number().min(0).max(100).describe('旅程の全体品質スコア（0-100）'),
  /** 発見された問題 */
  issues: z.array(ReviewIssueSchema).describe('発見された問題点のリスト'),
  /** 良い点 */
  strengths: z.array(z.string()).describe('旅程の良い点（日本語）'),
});

export type ReviewIssue = z.infer<typeof ReviewIssueSchema>;
export type ReviewResult = z.infer<typeof ReviewResultSchema>;
