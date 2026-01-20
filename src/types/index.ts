/**
 * 型定義の統合エクスポート
 * Centralized Type Exports for AI Travel Planner
 */

// 旅程関連型
export type {
  Activity,
  DayPlan,
  Reference,
  Itinerary,
  PlanOutlineDay,
  PlanOutline,
} from './itinerary';

// ユーザー入力型
export type { UserInput } from './user-input';

// 渡航情報関連型
export type {
  TravelInfoCategory,
  SourceType,
  DangerLevel,
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
