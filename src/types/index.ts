/**
 * 型定義の統合エクスポート
 * Centralized Type Exports for AI Travel Planner
 */

// 旅程関連型
export type {
  Activity,
  ActivityType,
  ActivitySource,
  ActivitySourceType,
  ActivityValidation,
  BudgetEstimate,
  DayPlan,
  Reference,
  Itinerary,
  PlanOutlineDay,
  PlanOutline,
  TransitType,
  TransitInfo,
  TimelineItem,
  TimelineItemType,
  ModelInfo,
} from './itinerary';

// ユーザー入力型
export type { UserInput, FixedScheduleItem } from './user-input';

// 渡航情報関連型
export type {
  TravelInfoCategory,
  SourceType,
  DangerLevel,
  WarningPriority,
  WarningInfo,
  TravelInfoSource,
  HighRiskRegion,
  SafetyInfo,
  EmergencyContact,
  Embassy,
  ClimateInfo,
  CurrentWeather,
  WeatherForecast,
  BasicCountryInfo,
  Currency,
  ExchangeRate,
  VisaInfo,
  MannerInfo,
  TippingInfo,
  TransportInfo,
  RideshareInfo,
  LocalFoodInfo,
  FoodItem,
  SouvenirInfo,
  SouvenirItem,
  EventsInfo,
  EventItem,
  TechnologyInfo,
  HealthcareInfo,
  RestroomsInfo,
  SmokingInfo,
  AlcoholInfo,
  CategoryDataMap,
  CategoryDataEntry,
  TravelInfoRequest,
  TravelInfoOptions,
  FailedCategory,
  TravelInfoResponse,
  PartialTravelInfo,
  AnyCategoryData,
} from './travel-info';

// 渡航情報の定数も再エクスポート
export {
  ALL_TRAVEL_INFO_CATEGORIES,
  CATEGORY_LABELS,
  DANGER_LEVEL_DESCRIPTIONS,
} from './travel-info';

// API関連型
export type {
  Article,
  SearchOptions,
  AIService,
  ContentRetriever,
} from './api';

// 共通ユーティリティ型
export type {
  AsyncResult,
  Nullable,
  Optional,
  DeepPartial,
  DateRange,
} from './common';

// 認証関連型
export type {
  User,
  AuthState,
  Session,
  AuthProvider,
  LoginOptions,
  AuthError,
} from './auth';

// プラン保存・課金関連型
export type {
  Plan,
  CreatePlanParams,
  UpdatePlanParams,
  PlanListItem,
  LocalPlan,
  LocalPlanStorage,
  EncryptedPlanData,
  PlanEncryptionResult,
  EntitlementType,
  GrantType,
  EntitlementStatus,
  GrantSource,
  ConsumeResult,
  UserEntitlements,
  RateLimitInfo,
  RateLimitConfig,
  SyncResult,
  SyncPreviewInfo,
} from './plans';

// 課金関連型
export type {
  PlanType,
  TicketType,
  PurchaseType,
  UserBillingStatus,
  BillingAccessInfo,
  PricingPlanInfo,
  CheckoutSessionResult,
  PortalSessionResult,
} from './billing';

// ストリーミング生成関連型
export type {
  GenerationPhase,
  DayGenerationStatus,
  HeroImageData,
  ChunkInfo,
  GenerationState,
} from './streaming';

export { initialGenerationState } from './streaming';

// Places API関連型
export type {
  PlacePhoto,
  PlaceOpeningHours,
  PlaceDetails,
  PlaceSearchQuery,
  PlaceSearchType,
  PlaceSearchResult,
  PlaceValidationResult,
  PlacesCacheEntry,
  PlacesCacheConfig,
  PlacesSearchRequest,
  PlacesSearchResponse,
  PlacesApiErrorCode,
} from './places';

export { PlacesApiError } from './places';

// 持ち物リスト関連型
export type {
  PackingItem,
  PackingCategory,
  PackingList,
} from './packing-list';

export {
  PACKING_CATEGORY_LABELS,
  PACKING_CATEGORY_ICONS,
  PACKING_PRIORITY_LABELS,
} from './packing-list';
