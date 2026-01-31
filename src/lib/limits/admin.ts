/**
 * 管理者判定
 *
 * 環境変数で管理者メールを管理
 */

/**
 * Get admin emails from environment variable
 * This is evaluated at runtime to support testing
 */
function getAdminEmailsFromEnv(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmailsFromEnv();
  return adminEmails.includes(email.toLowerCase());
}

export function getAdminEmails(): string[] {
  return getAdminEmailsFromEnv();
}
