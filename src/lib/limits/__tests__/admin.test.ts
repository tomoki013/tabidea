import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAdmin, getAdminEmails } from '../admin';

describe('isAdmin', () => {
  const originalEnv = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    // テスト用の環境変数を設定
    process.env.ADMIN_EMAILS = 'admin@example.com,super-admin@example.com';
  });

  afterEach(() => {
    // 環境変数を元に戻す
    process.env.ADMIN_EMAILS = originalEnv;
  });

  it('管理者メールはtrueを返す', () => {
    expect(isAdmin('admin@example.com')).toBe(true);
    expect(isAdmin('super-admin@example.com')).toBe(true);
  });

  it('大文字小文字を区別しない', () => {
    expect(isAdmin('ADMIN@EXAMPLE.COM')).toBe(true);
    expect(isAdmin('Admin@Example.com')).toBe(true);
  });

  it('管理者以外のメールはfalseを返す', () => {
    expect(isAdmin('user@example.com')).toBe(false);
    expect(isAdmin('test@example.com')).toBe(false);
  });

  it('nullやundefinedはfalseを返す', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it('空文字はfalseを返す', () => {
    expect(isAdmin('')).toBe(false);
  });
});

describe('getAdminEmails', () => {
  const originalEnv = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'admin1@example.com,admin2@example.com';
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEnv;
  });

  it('管理者メールリストを返す', () => {
    const emails = getAdminEmails();
    expect(emails).toHaveLength(2);
    expect(emails).toContain('admin1@example.com');
    expect(emails).toContain('admin2@example.com');
  });

  it('環境変数が空の場合は空配列を返す', () => {
    process.env.ADMIN_EMAILS = '';
    const emails = getAdminEmails();
    expect(emails).toHaveLength(0);
  });
});
