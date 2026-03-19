import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hasSupabaseAuthCookies, resolveUserI18nPreferences, updateSession } from '@/lib/supabase/proxy';

const createServerClientMock = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

describe('supabase proxy helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('detects Supabase auth cookies including chunked cookie names', () => {
    const request = new NextRequest('https://example.com/ja', {
      headers: {
        cookie: 'sb-project-auth-token.0=chunk-a; theme=dark',
      },
    });

    expect(hasSupabaseAuthCookies(request)).toBe(true);
  });

  it('skips anonymous middleware session refreshes without hitting Supabase', async () => {
    const request = new NextRequest('https://example.com/ja');

    await updateSession(request);

    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it('falls back to detected language when Supabase profile lookup exceeds the proxy deadline', async () => {
    vi.useFakeTimers();

    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    const maybeSingle = vi.fn(() => new Promise(() => undefined));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    createServerClientMock.mockReturnValue({
      auth: { getUser },
      from,
    });

    const request = new NextRequest('https://example.com/ja', {
      headers: {
        cookie: 'sb-project-auth-token=token',
      },
    });

    const pendingResult = resolveUserI18nPreferences(request, {
      detectedLanguage: 'ja',
      requestedLanguage: null,
    });

    await vi.advanceTimersByTimeAsync(1_600);
    const result = await pendingResult;

    expect(result.preferences.uiLanguage).toBe('ja');
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('users');

  });
});
