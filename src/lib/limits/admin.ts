/**
 * 管理者判定
 *
 * 環境変数で管理者メールを管理
 */

// カンマ区切りで複数指定可能
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean);

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function getAdminEmails(): string[] {
  return ADMIN_EMAILS;
}
