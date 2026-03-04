'use client';

import { useState, useEffect } from 'react';
import { verifyPassword, getDestinationList, fetchRawData, type RawDataResult } from './actions';
import { usePathname } from 'next/navigation';
import { DEFAULT_LANGUAGE, getLanguageFromPathname } from '@/lib/i18n/locales';

export default function ApiResponseDebugPage() {
  const pathname = usePathname();
  const language = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const text = language === 'ja'
    ? {
        invalidPassword: 'パスワードが正しくありません',
        clientError: 'クライアント側エラーが発生しました',
        noContent: 'コンテンツがありません',
        truncated: '\n\n...（表示のため省略しています）',
        accessTitle: 'APIデバッグアクセス',
        password: 'パスワード',
        passwordPlaceholder: 'パスワードを入力',
        access: 'アクセス',
        mainTitle: 'API生レスポンスデバッガー',
        authenticated: '管理者として認証済み',
        apiSource: 'APIソース',
        feedType: 'フィード種別',
        destination: '目的地',
        loadingDestinations: '目的地を読み込み中...',
        fetching: '取得中...',
        fetchRawData: '生データを取得',
        requestDetails: 'リクエスト詳細',
        responseStatus: 'レスポンス状態',
        rawResponseBody: '生レスポンス本文',
        truncatedDisplay: '省略表示',
        fullDisplay: '全文表示',
        responseHeaders: 'レスポンスヘッダー',
        noHeaders: 'ヘッダー情報なし',
        targetUrl: '対象URL',
        method: 'メソッド',
        countryCode: '国コード',
        targetDestination: '対象目的地',
        success: '成功',
        httpStatus: 'HTTPステータス',
        size: 'サイズ',
        message: 'メッセージ',
      }
    : {
        invalidPassword: 'Invalid password',
        clientError: 'Client-side error occurred',
        noContent: 'No content',
        truncated: '\n\n... (Truncated for display to prevent browser lag)',
        accessTitle: 'API Debug Access',
        password: 'Password',
        passwordPlaceholder: 'Enter password',
        access: 'Access',
        mainTitle: 'API Raw Response Debugger',
        authenticated: 'Authenticated as Admin',
        apiSource: 'API Source',
        feedType: 'Feed Type',
        destination: 'Destination',
        loadingDestinations: 'Loading destinations...',
        fetching: 'Fetching...',
        fetchRawData: 'Fetch Raw Data',
        requestDetails: 'Request Details',
        responseStatus: 'Response Status',
        rawResponseBody: 'Raw Response Body',
        truncatedDisplay: 'Truncated display',
        fullDisplay: 'Full display',
        responseHeaders: 'Response Headers',
        noHeaders: 'No headers available',
        targetUrl: 'Target URL',
        method: 'Method',
        countryCode: 'Country Code',
        targetDestination: 'Target Destination',
        success: 'Success',
        httpStatus: 'HTTP Status',
        size: 'Size',
        message: 'Message',
      };

  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const [destinations, setDestinations] = useState<string[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);

  const [selectedSource, setSelectedSource] = useState('mofa');
  const [feedType, setFeedType] = useState('A'); // 'A' | 'L' | 'Normal'
  const [selectedDestination, setSelectedDestination] = useState('');
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<RawDataResult | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      getDestinationList().then((list) => {
        setDestinations(list);
        if (list.length > 0) setSelectedDestination(list[0]);
        setLoadingDestinations(false);
      });
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = await verifyPassword(password);
    if (valid) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError(text.invalidPassword);
    }
  };

  const handleFetch = async () => {
    setFetching(true);
    setResult(null);
    try {
      const data = await fetchRawData(password, selectedSource, selectedDestination, feedType);
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({ success: false, message: text.clientError });
    } finally {
      setFetching(false);
    }
  };

  // Function to prettify body content based on format
  const getFormattedBody = () => {
    if (!result?.body) return result?.message || text.noContent;

    const MAX_DISPLAY_SIZE = 50 * 1024; // 50KB limit for display
    let content = result.body;
    let isTruncated = false;

    if (content.length > MAX_DISPLAY_SIZE) {
      content = content.substring(0, MAX_DISPLAY_SIZE);
      isTruncated = true;
    }

    // Check if it's JSON
    try {
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        const json = JSON.parse(content); // Note: Might fail if truncated, but try anyway
        content = JSON.stringify(json, null, 2);
      }
    } catch {
      // Not valid JSON or truncated JSON, return as is
    }

    if (isTruncated) {
      return content + text.truncated;
    }

    return content;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">{text.accessTitle}</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{text.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder={text.passwordPlaceholder}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-indigo-600 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {text.access}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">{text.mainTitle}</h1>
          <div className="text-sm text-gray-500">{text.authenticated}</div>
        </header>

        {/* Controls */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">{text.apiSource}</label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="mofa">Ministry of Foreign Affairs (MOFA)</option>
                <option value="restcountries">REST Countries API</option>
                <option value="weather" disabled>Weather API (Not Implemented)</option>
                <option value="exchange" disabled>Exchange API (Not Implemented)</option>
              </select>
            </div>

            {selectedSource === 'mofa' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{text.feedType}</label>
                <select
                  value={feedType}
                  onChange={(e) => setFeedType(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="A">All (Risk + Detail + History)</option>
                  <option value="L">Light (Risk + Titles only)</option>
                  <option value="Normal">Normal (Risk + Detail)</option>
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">{text.destination}</label>
              {loadingDestinations ? (
                <div className="p-2 text-gray-500">{text.loadingDestinations}</div>
              ) : (
                <select
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {destinations.map((dest) => (
                    <option key={dest} value={dest}>
                      {dest}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-end">
              <button
                onClick={handleFetch}
                disabled={fetching || loadingDestinations}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300"
              >
                {fetching ? text.fetching : text.fetchRawData}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Metadata Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-medium text-gray-900">{text.requestDetails}</h3>
                <dl className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="font-medium text-gray-500">{text.targetUrl}</dt>
                    <dd className="col-span-2 break-all font-mono text-gray-900">{result.url || 'N/A'}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="font-medium text-gray-500">{text.method}</dt>
                    <dd className="col-span-2 text-gray-900">{result.method || 'GET'}</dd>
                  </div>
                  {result.countryCode && (
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="font-medium text-gray-500">{text.countryCode}</dt>
                    <dd className="col-span-2 font-mono text-gray-900">{result.countryCode}</dd>
                  </div>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="font-medium text-gray-500">{text.targetDestination}</dt>
                    <dd className="col-span-2 text-gray-900">{result.destination || selectedDestination}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-medium text-gray-900">{text.responseStatus}</h3>
                <dl className="space-y-2 text-sm">
                   <div className="grid grid-cols-3 gap-4">
                    <dt className="font-medium text-gray-500">{text.success}</dt>
                    <dd className={`col-span-2 font-bold ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                      {result.success ? 'TRUE' : 'FALSE'}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="font-medium text-gray-500">{text.httpStatus}</dt>
                    <dd className="col-span-2 text-gray-900">
                      {result.status ? `${result.status} ${result.statusText || ''}` : 'N/A'}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="font-medium text-gray-500">{text.size}</dt>
                    <dd className="col-span-2 text-gray-900 font-mono">
                      {result.size ? `${(result.size / 1024).toFixed(2)} KB` : 'Unknown'}
                      {result.size && result.size > 1024 * 1024 ? ` (${(result.size / (1024 * 1024)).toFixed(2)} MB)` : ''}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="font-medium text-gray-500">{text.message}</dt>
                    <dd className="col-span-2 text-gray-900">{result.message || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Raw Body */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{text.rawResponseBody}</h3>
                <span className="text-xs text-gray-500">
                    {result.body && result.body.length > 50 * 1024 ? text.truncatedDisplay : text.fullDisplay}
                </span>
              </div>
              <div className="p-0">
                <pre className="max-h-[600px] w-full overflow-auto bg-slate-900 p-6 text-xs text-green-400 font-mono leading-relaxed rounded-b-lg">
                  {getFormattedBody()}
                </pre>
              </div>
            </div>

            {/* Headers (Collapsible or just listed) */}
             <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900">{text.responseHeaders}</h3>
              </div>
              <div className="p-6">
                <div className="max-h-[200px] overflow-auto">
                    <table className="min-w-full text-sm">
                        <tbody>
                            {result.headers && Object.entries(result.headers).map(([key, value]) => (
                                <tr key={key} className="border-b border-gray-100 last:border-0">
                                    <td className="py-2 pr-4 font-medium text-gray-600">{key}</td>
                                    <td className="py-2 text-gray-900 font-mono">{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {(!result.headers || Object.keys(result.headers).length === 0) && (
                        <p className="text-gray-500 italic">{text.noHeaders}</p>
                    )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
