/**
 * ルート定義
 * Application Route Constants
 */

/**
 * アプリケーションのルート定義
 */
export const ROUTES = {
  // メインページ
  HOME: '/',
  USAGE: '/usage',
  FAQ: '/faq',
  ABOUT: '/about',
  FEATURES: '/features',
  CONTACT: '/contact',
  UPDATES: '/updates',

  // プランナー機能
  PLAN: '/plan',
  SAMPLES: '/samples',

  // 渡航情報
  TRAVEL_INFO: '/travel-info',

  // ポリシー・規約
  TERMS: '/terms',
  PRIVACY: '/privacy',
  COOKIE_POLICY: '/cookie-policy',
  AI_POLICY: '/ai-policy',
} as const;

/**
 * ルートの型
 */
export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * 動的ルートのヘルパー関数
 */
export const dynamicRoutes = {
  /**
   * サンプルプラン詳細ページ
   */
  sampleDetail: (id: string) => `${ROUTES.SAMPLES}/${id}` as const,

  /**
   * 渡航情報詳細ページ
   */
  travelInfoDestination: (destination: string) =>
    `${ROUTES.TRAVEL_INFO}/${encodeURIComponent(destination)}` as const,
} as const;
