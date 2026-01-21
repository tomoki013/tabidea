/**
 * 外務省海外安全情報API
 * Ministry of Foreign Affairs (MOFA) Safety Information API
 *
 * 外務省オープンデータを使用して海外安全情報を取得
 * https://www.ezairyu.mofa.go.jp/html/opendata/index.html
 *
 * データ形式: XML
 * 更新頻度: 5分毎
 * 利用条件: 無償、営利・非営利問わず自由利用可能
 */

import { XMLParser } from 'fast-xml-parser';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

import {
  TravelInfoCategory,
  SourceType,
  SafetyInfo,
  TravelInfoSource,
  DangerLevel,
  EmergencyContact,
  Embassy,
  HighRiskRegion,
  DANGER_LEVEL_DESCRIPTIONS,
} from '@/types';

import {
  ITravelInfoSource,
  SourceOptions,
  SourceResult,
  TravelInfoServiceError,
  ICacheManager,
} from '../interfaces';

// ============================================
// 設定・定数
// ============================================

/**
 * 外務省オープンデータのベースURL
 */
const MOFA_OPENDATA_BASE_URL = 'https://www.ezairyu.mofa.go.jp/opendata';

/**
 * 外務省海外安全ホームページのベースURL
 */
const MOFA_ANZEN_BASE_URL = 'https://www.anzen.mofa.go.jp';

/**
 * デフォルトタイムアウト（ミリ秒）
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * キャッシュのTTL（秒）- 5分（オープンデータの更新頻度に合わせる）
 */
const CACHE_TTL_SECONDS = 300;

/**
 * リトライ回数
 */
const MAX_RETRIES = 2;

/**
 * リトライ間隔（ミリ秒）
 */
const RETRY_DELAY_MS = 1000;

// ============================================
// 国コードマッピング
// ============================================

/**
 * 目的地名から外務省オープンデータの国コードへのマッピング
 * 国コードは国際電話の国番号に基づく
 */
const DESTINATION_TO_COUNTRY_CODE: Record<string, string> = {
  'UAE': '0971',
  'アイスランド': '0354',
  'アイルランド': '0353',
  'アゼルバイジャン': '0994',
  'アテネ': '0030',
  'アディスアベバ': '0251',
  'アフガニスタン': '0093',
  'アブダビ': '0971',
  'アムステルダム': '0031',
  'アメリカ': '1000',
  'アメリカ合衆国（グアム）': '1002',
  'アメリカ合衆国（ハワイ）': '1808',
  'アメリカ合衆国（北マリアナ諸島）': '1001',
  'アメリカ合衆国（本土）': '1000',
  'アラブ首長国連邦': '0971',
  'アルジェリア': '0213',
  'アルゼンチン': '0054',
  'アルバニア': '0355',
  'アルメニア': '0374',
  'アンゴラ': '0244',
  'アンティグア・バーブーダ': '1268',
  'アンドラ': '0376',
  'イエメン': '0967',
  'イギリス': '0044',
  'イスタンブール': '0090',
  'イスラエル': '0972',
  'イタリア': '0039',
  'イラク': '0964',
  'イラン': '0098',
  'インド': '0091',
  'インドネシア': '0062',
  'ウィーン': '0043',
  'ウガンダ': '0256',
  'ウクライナ': '0380',
  'ウズベキスタン': '0998',
  'ウルグアイ': '0598',
  'エクアドル': '0593',
  'エジプト': '0020',
  'エストニア': '0372',
  'エスワティニ': '0268',
  'エチオピア': '0251',
  'エリトリア': '0291',
  'エルサルバドル': '0503',
  'オスロ': '0047',
  'オマーン': '0968',
  'オランダ': '0031',
  'オークランド': '0064',
  'オーストラリア': '0061',
  'オーストリア': '0043',
  'カイロ': '0020',
  'カザフスタン': '0007',
  'カタール': '0974',
  'カナダ': '9001',
  'カメルーン': '0237',
  'カンクン': '0052',
  'カンパラ': '0256',
  'カンボジア': '0855',
  'カーボベルデ': '0238',
  'ガイアナ': '0592',
  'ガボン': '0241',
  'ガンビア': '0220',
  'ガーナ': '0233',
  'キガリ': '0250',
  'キプロス': '0357',
  'キューバ': '0053',
  'キリバス': '0686',
  'キルギス': '0996',
  'キーウ': '0380',
  'ギニア': '0224',
  'ギニアビサウ': '0245',
  'ギリシャ': '0030',
  'クアラルンプール': '0060',
  'クウェート': '0965',
  'クック諸島': '0682',
  'クラクフ': '0048',
  'クロアチア': '0385',
  'グアテマラ': '0502',
  'グアム': '1002',
  'グレナダ': '0473',
  'グレートブリテン及び北部アイルランド連合王国': '0044',
  'ケアンズ': '0061',
  'ケニア': '0254',
  'ケープタウン': '0027',
  'コスタリカ': '0506',
  'コソボ': '9381',
  'コペンハーゲン': '0045',
  'コモロ': '0269',
  'コロンビア': '0057',
  'コンゴ共和国': '0242',
  'コンゴ民主共和国': '0243',
  'コートジボワール': '0225',
  'サイパン': '1001',
  'サイプラス': '0357',
  'サウジアラビア': '0966',
  'サモア独立国': '0685',
  'サモア（米領）': '1684',
  'サンディエゴ': '1000',
  'サントメ・プリンシペ': '0239',
  'サンパウロ': '0055',
  'サンフランシスコ': '1000',
  'サンマリノ': '0378',
  'ザンビア': '0260',
  'シアトル': '1000',
  'シェムリアップ': '0855',
  'シエラレオネ': '0232',
  'シカゴ': '1000',
  'シドニー': '0061',
  'シリア': '0963',
  'シンガポール': '0065',
  'ジブチ': '0253',
  'ジャカルタ': '0062',
  'ジャマイカ': '0876',
  'ジュネーブ': '0041',
  'ジョージア（旧グルジア）': '0995',
  'ジンバブエ': '0263',
  'スイス': '0041',
  'スウェーデン': '0046',
  'ストックホルム': '0046',
  'スペイン': '0034',
  'スリナム': '0597',
  'スリランカ': '0094',
  'スロバキア': '0421',
  'スロベニア': '0386',
  'スーダン': '0249',
  'セネガル': '0221',
  'セブ': '0063',
  'セルビア': '0381',
  'セントクリストファー・ネービス': '0869',
  'セントビンセント及びグレナディーン諸島': '0784',
  'セントルシア': '0758',
  'セーシェル': '0248',
  'ソウル': '0082',
  'ソマリア': '0252',
  'ソロモン諸島': '0677',
  'タイ': '0066',
  'タジキスタン': '0992',
  'タヒチ': '9689',
  'タヒチ（仏領ポリネシア）': '9689',
  'タンザニア': '0255',
  'ダカール': '0221',
  'ダナン': '0084',
  'ダブリン': '0353',
  'ダルエスサラーム': '0255',
  'チェコ': '0420',
  'チェンマイ': '0066',
  'チャド': '0235',
  'チュニジア': '0216',
  'チューリッヒ': '0041',
  'チリ': '0056',
  'ツバル': '0688',
  'テヘラン': '0098',
  'デリー': '0091',
  'デンマーク': '0045',
  'トリニダード・トバゴ': '0868',
  'トルクメニスタン': '0993',
  'トルコ': '0090',
  'トロント': '9001',
  'トンガ': '0676',
  'トーゴ': '0228',
  'ドイツ': '0049',
  'ドバイ': '0971',
  'ドブロブニク': '0385',
  'ドミニカ共和国': '0809',
  'ドミニカ国': '0767',
  'ドーハ': '0974',
  'ナイジェリア': '0234',
  'ナイロビ': '0254',
  'ナウル': '0674',
  'ナミビア': '0264',
  'ニウエ': '0683',
  'ニカラグア': '0505',
  'ニジェール': '0227',
  'ニューカレドニア': '0687',
  'ニューカレドニア（仏領）': '0687',
  'ニュージーランド': '0064',
  'ニューヨーク': '1000',
  'ネパール': '0977',
  'ノルウェー': '0047',
  'ハイチ': '0509',
  'ハノイ': '0084',
  'ハバナ': '0053',
  'ハワイ': '1808',
  'ハンガリー': '0036',
  'バチカン市国': '9039',
  'バヌアツ': '0678',
  'バハマ': '1242',
  'バリ': '0062',
  'バルセロナ': '0034',
  'バルバドス': '1246',
  'バンクーバー': '9001',
  'バングラデシュ': '0880',
  'バンコク': '0066',
  'バーレーン': '0973',
  'パキスタン': '0092',
  'パナマ': '0507',
  'パプアニューギニア': '0675',
  'パラオ': '0680',
  'パラグアイ': '0595',
  'パリ': '0033',
  'パレスチナ': '0970',
  'フィジー': '0679',
  'フィリピン': '0063',
  'フィレンツェ': '0039',
  'フィンランド': '0358',
  'フランス': '0033',
  'ブエノスアイレス': '0054',
  'ブダペスト': '0036',
  'ブラジル': '0055',
  'ブリュッセル': '0032',
  'ブルガリア': '0359',
  'ブルキナファソ': '0226',
  'ブルネイ': '0673',
  'ブルンジ': '0257',
  'ブータン': '0975',
  'プノンペン': '0855',
  'プラハ': '0420',
  'プーケット': '0066',
  'ヘルシンキ': '0358',
  'ベトナム': '0084',
  'ベナン': '0229',
  'ベネズエラ': '0058',
  'ベネチア': '0039',
  'ベラルーシ': '0375',
  'ベリーズ': '0501',
  'ベルギー': '0032',
  'ベルリン': '0049',
  'ペルー': '0051',
  'ホノルル': '1808',
  'ホンジュラス': '0504',
  'ホーチミン': '0084',
  'ボストン': '1000',
  'ボスニア・ヘルツェゴビナ': '0387',
  'ボツワナ': '0267',
  'ボリビア': '0591',
  'ポルトガル': '0351',
  'ポーランド': '0048',
  'マイアミ': '1000',
  'マカオ': '0853',
  'マダガスカル': '0261',
  'マチュピチュ': '0051',
  'マドリード': '0034',
  'マニラ': '0063',
  'マラウイ': '0265',
  'マラケシュ': '0212',
  'マリ': '0223',
  'マルタ': '0356',
  'マレーシア': '0060',
  'マーシャル諸島': '0692',
  'ミクロネシア': '0691',
  'ミャンマー': '0095',
  'ミュンヘン': '0049',
  'ミラノ': '0039',
  'ムンバイ': '0091',
  'メキシコ': '0052',
  'メルボルン': '0061',
  'モザンビーク': '0258',
  'モスクワ': '9007',
  'モナコ': '0377',
  'モルディブ': '0960',
  'モルドバ': '0373',
  'モロッコ': '0212',
  'モンゴル': '0976',
  'モンテネグロ': '0382',
  'モントリオール': '9001',
  'モーリシャス': '0230',
  'モーリタニア': '0222',
  'ヨハネスブルグ': '0027',
  'ヨルダン': '0962',
  'ラオス': '0856',
  'ラゴス': '0234',
  'ラスベガス': '1000',
  'ラトビア': '0371',
  'リオデジャネイロ': '0055',
  'リスボン': '0351',
  'リトアニア': '0370',
  'リヒテンシュタイン': '0423',
  'リビア': '0218',
  'リベリア': '0231',
  'リマ': '0051',
  'ルクセンブルク': '0352',
  'ルワンダ': '0250',
  'ルーマニア': '0040',
  'レソト': '0266',
  'レバノン': '0961',
  'ロサンゼルス': '1000',
  'ロシア': '9007',
  'ロンドン': '0044',
  'ローマ': '0039',
  'ワシントンDC': '1000',
  'ワルシャワ': '0048',
  '上海': '0086',
  '中国': '0086',
  '中央アフリカ': '0236',
  '中華人民共和国': '0086',
  '仏領': '0687',
  '仏領ポリネシア': '9689',
  '北マケドニア共和国': '0389',
  '北マリアナ諸島': '1001',
  '北京': '0086',
  '北朝鮮': '0850',
  '南アフリカ': '0027',
  '南アフリカ共和国': '0027',
  '南スーダン': '0211',
  '台北': '0886',
  '台湾': '0886',
  '大韓民国': '0082',
  '旧グルジア': '0995',
  '本土': '1000',
  '東ティモール': '0670',
  '米国（グアム）': '1002',
  '米国（ハワイ）': '1808',
  '米国（北マリアナ諸島）': '1001',
  '米国（本土）': '1000',
  '米領': '1684',
  '英国': '0044',
  '西サハラ': '9212',
  '豪州': '0061',
  '赤道ギニア': '0240',
  '釜山': '0082',
  '韓国': '0082',
  '韓国（ソウル）': '0082',
  '香港': '0852',
};

/**
 * 国コードから国名へのマッピング（逆引き用）
 */
const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  '0007': 'カザフスタン',
  '0020': 'エジプト',
  '0027': '南アフリカ',
  '0030': 'ギリシャ',
  '0031': 'オランダ',
  '0032': 'ベルギー',
  '0033': 'フランス',
  '0034': 'スペイン',
  '0036': 'ハンガリー',
  '0039': 'イタリア',
  '0040': 'ルーマニア',
  '0041': 'スイス',
  '0043': 'オーストリア',
  '0044': 'イギリス',
  '0045': 'デンマーク',
  '0046': 'スウェーデン',
  '0047': 'ノルウェー',
  '0048': 'ポーランド',
  '0049': 'ドイツ',
  '0051': 'ペルー',
  '0052': 'メキシコ',
  '0053': 'キューバ',
  '0054': 'アルゼンチン',
  '0055': 'ブラジル',
  '0056': 'チリ',
  '0057': 'コロンビア',
  '0058': 'ベネズエラ',
  '0060': 'マレーシア',
  '0061': 'オーストラリア',
  '0062': 'インドネシア',
  '0063': 'フィリピン',
  '0064': 'ニュージーランド',
  '0065': 'シンガポール',
  '0066': 'タイ',
  '0082': '韓国',
  '0084': 'ベトナム',
  '0086': '中国',
  '0090': 'トルコ',
  '0091': 'インド',
  '0092': 'パキスタン',
  '0093': 'アフガニスタン',
  '0094': 'スリランカ',
  '0095': 'ミャンマー',
  '0098': 'イラン',
  '0211': '南スーダン',
  '0212': 'モロッコ',
  '0213': 'アルジェリア',
  '0216': 'チュニジア',
  '0218': 'リビア',
  '0220': 'ガンビア',
  '0221': 'セネガル',
  '0222': 'モーリタニア',
  '0223': 'マリ',
  '0224': 'ギニア',
  '0225': 'コートジボワール',
  '0226': 'ブルキナファソ',
  '0227': 'ニジェール',
  '0228': 'トーゴ',
  '0229': 'ベナン',
  '0230': 'モーリシャス',
  '0231': 'リベリア',
  '0232': 'シエラレオネ',
  '0233': 'ガーナ',
  '0234': 'ナイジェリア',
  '0235': 'チャド',
  '0236': '中央アフリカ',
  '0237': 'カメルーン',
  '0238': 'カーボベルデ',
  '0239': 'サントメ・プリンシペ',
  '0240': '赤道ギニア',
  '0241': 'ガボン',
  '0242': 'コンゴ共和国',
  '0243': 'コンゴ民主共和国',
  '0244': 'アンゴラ',
  '0245': 'ギニアビサウ',
  '0248': 'セーシェル',
  '0249': 'スーダン',
  '0250': 'ルワンダ',
  '0251': 'エチオピア',
  '0252': 'ソマリア',
  '0253': 'ジブチ',
  '0254': 'ケニア',
  '0255': 'タンザニア',
  '0256': 'ウガンダ',
  '0257': 'ブルンジ',
  '0258': 'モザンビーク',
  '0260': 'ザンビア',
  '0261': 'マダガスカル',
  '0263': 'ジンバブエ',
  '0264': 'ナミビア',
  '0265': 'マラウイ',
  '0266': 'レソト',
  '0267': 'ボツワナ',
  '0268': 'エスワティニ',
  '0269': 'コモロ',
  '0291': 'エリトリア',
  '0351': 'ポルトガル',
  '0352': 'ルクセンブルク',
  '0353': 'アイルランド',
  '0354': 'アイスランド',
  '0355': 'アルバニア',
  '0356': 'マルタ',
  '0357': 'キプロス',
  '0358': 'フィンランド',
  '0359': 'ブルガリア',
  '0370': 'リトアニア',
  '0371': 'ラトビア',
  '0372': 'エストニア',
  '0373': 'モルドバ',
  '0374': 'アルメニア',
  '0375': 'ベラルーシ',
  '0376': 'アンドラ',
  '0377': 'モナコ',
  '0378': 'サンマリノ',
  '0380': 'ウクライナ',
  '0381': 'セルビア',
  '0382': 'モンテネグロ',
  '0385': 'クロアチア',
  '0386': 'スロベニア',
  '0387': 'ボスニア・ヘルツェゴビナ',
  '0389': '北マケドニア共和国',
  '0420': 'チェコ',
  '0421': 'スロバキア',
  '0423': 'リヒテンシュタイン',
  '0473': 'グレナダ',
  '0501': 'ベリーズ',
  '0502': 'グアテマラ',
  '0503': 'エルサルバドル',
  '0504': 'ホンジュラス',
  '0505': 'ニカラグア',
  '0506': 'コスタリカ',
  '0507': 'パナマ',
  '0509': 'ハイチ',
  '0591': 'ボリビア',
  '0592': 'ガイアナ',
  '0593': 'エクアドル',
  '0595': 'パラグアイ',
  '0597': 'スリナム',
  '0598': 'ウルグアイ',
  '0670': '東ティモール',
  '0673': 'ブルネイ',
  '0674': 'ナウル',
  '0675': 'パプアニューギニア',
  '0676': 'トンガ',
  '0677': 'ソロモン諸島',
  '0678': 'バヌアツ',
  '0679': 'フィジー',
  '0680': 'パラオ',
  '0682': 'クック諸島',
  '0683': 'ニウエ',
  '0685': 'サモア独立国',
  '0686': 'キリバス',
  '0687': 'ニューカレドニア',
  '0688': 'ツバル',
  '0691': 'ミクロネシア',
  '0692': 'マーシャル諸島',
  '0758': 'セントルシア',
  '0767': 'ドミニカ国',
  '0784': 'セントビンセント及びグレナディーン諸島',
  '0809': 'ドミニカ共和国',
  '0850': '北朝鮮',
  '0852': '香港',
  '0853': 'マカオ',
  '0855': 'カンボジア',
  '0856': 'ラオス',
  '0868': 'トリニダード・トバゴ',
  '0869': 'セントクリストファー・ネービス',
  '0876': 'ジャマイカ',
  '0880': 'バングラデシュ',
  '0886': '台湾',
  '0960': 'モルディブ',
  '0961': 'レバノン',
  '0962': 'ヨルダン',
  '0963': 'シリア',
  '0964': 'イラク',
  '0965': 'クウェート',
  '0966': 'サウジアラビア',
  '0967': 'イエメン',
  '0968': 'オマーン',
  '0970': 'パレスチナ',
  '0971': 'UAE',
  '0972': 'イスラエル',
  '0973': 'バーレーン',
  '0974': 'カタール',
  '0975': 'ブータン',
  '0976': 'モンゴル',
  '0977': 'ネパール',
  '0992': 'タジキスタン',
  '0993': 'トルクメニスタン',
  '0994': 'アゼルバイジャン',
  '0995': 'ジョージア（旧グルジア）',
  '0996': 'キルギス',
  '0998': 'ウズベキスタン',
  '1000': 'アメリカ',
  '1001': '北マリアナ諸島',
  '1002': 'グアム',
  '1242': 'バハマ',
  '1246': 'バルバドス',
  '1268': 'アンティグア・バーブーダ',
  '1684': 'サモア（米領）',
  '1808': 'ハワイ',
  '9001': 'カナダ',
  '9007': 'ロシア',
  '9039': 'バチカン市国',
  '9212': '西サハラ',
  '9381': 'コソボ',
  '9689': 'タヒチ',
};

/**
 * 主要都市・国の緊急連絡先マッピング
 */
const EMERGENCY_CONTACTS_BY_COUNTRY: Record<string, EmergencyContact[]> = {
  '0066': [
    // タイ
    { name: '警察', number: '191' },
    { name: '救急車', number: '1669' },
    { name: 'ツーリストポリス', number: '1155' },
  ],
  '0063': [
    // フィリピン
    { name: '警察', number: '117' },
    { name: '救急・消防', number: '911' },
  ],
  '0084': [
    // ベトナム
    { name: '警察', number: '113' },
    { name: '救急', number: '115' },
    { name: '消防', number: '114' },
  ],
  '0065': [
    // シンガポール
    { name: '警察', number: '999' },
    { name: '救急・消防', number: '995' },
  ],
  '0082': [
    // 韓国
    { name: '警察', number: '112' },
    { name: '救急・消防', number: '119' },
    { name: '観光案内', number: '1330' },
  ],
  '0086': [
    // 中国
    { name: '警察', number: '110' },
    { name: '救急', number: '120' },
    { name: '消防', number: '119' },
  ],
  '0886': [
    // 台湾
    { name: '警察', number: '110' },
    { name: '救急・消防', number: '119' },
  ],
  '1000': [
    // アメリカ本土
    { name: '緊急通報（警察・消防・救急）', number: '911' },
  ],
  '1808': [
    // ハワイ
    { name: '緊急通報（警察・消防・救急）', number: '911' },
  ],
  '1002': [
    // グアム
    { name: '緊急通報（警察・消防・救急）', number: '911' },
  ],
  '1001': [
    // 北マリアナ諸島（サイパン）
    { name: '緊急通報（警察・消防・救急）', number: '911' },
  ],
  '9001': [
    // カナダ
    { name: '緊急通報（警察・消防・救急）', number: '911' },
  ],
  '0044': [
    // イギリス
    { name: '緊急通報（警察・消防・救急）', number: '999' },
    { name: 'EU緊急通報', number: '112' },
  ],
  '0033': [
    // フランス
    { name: '警察', number: '17' },
    { name: '救急', number: '15' },
    { name: '消防', number: '18' },
    { name: 'EU緊急通報', number: '112' },
  ],
  '0049': [
    // ドイツ
    { name: '警察', number: '110' },
    { name: '救急・消防', number: '112' },
  ],
  '0039': [
    // イタリア
    { name: '警察', number: '113' },
    { name: '救急', number: '118' },
    { name: '消防', number: '115' },
    { name: 'EU緊急通報', number: '112' },
  ],
  '0061': [
    // オーストラリア
    { name: '緊急通報（警察・消防・救急）', number: '000' },
  ],
};

/**
 * 主要国の日本大使館情報
 */
const EMBASSIES_BY_COUNTRY: Record<string, Embassy> = {
  '0066': {
    name: '在タイ日本国大使館',
    address: '177 Witthayu Road, Lumphini, Pathum Wan, Bangkok 10330',
    phone: '+66-2-207-8500',
  },
  '0063': {
    name: '在フィリピン日本国大使館',
    address: '2627 Roxas Boulevard, Pasay City, Metro Manila',
    phone: '+63-2-8551-5710',
  },
  '0084': {
    name: '在ベトナム日本国大使館',
    address: '27 Lieu Giai, Ba Dinh, Hanoi',
    phone: '+84-24-3846-3000',
  },
  '0065': {
    name: '在シンガポール日本国大使館',
    address: '16 Nassim Road, Singapore 258390',
    phone: '+65-6235-8855',
  },
  '0082': {
    name: '在大韓民国日本国大使館',
    address: '22-gil 6, Yulgok-ro, Jongno-gu, Seoul',
    phone: '+82-2-2170-5200',
  },
  '0086': {
    name: '在中華人民共和国日本国大使館',
    address: '1 Liangmaqiao Dongjie, Chaoyang District, Beijing 100600',
    phone: '+86-10-8531-9800',
  },
  '1000': {
    name: '在アメリカ合衆国日本国大使館',
    address: '2520 Massachusetts Avenue, N.W., Washington, D.C. 20008',
    phone: '+1-202-238-6700',
  },
  '1808': {
    name: '在ホノルル日本国総領事館',
    address: '1742 Nuuanu Avenue, Honolulu, HI 96817',
    phone: '+1-808-543-3111',
  },
  '1002': {
    name: '在ハガッニャ日本国総領事館',
    address: 'Suite 604, ITC Building, 590 South Marine Corps Drive, Tamuning, Guam 96913',
    phone: '+1-671-646-1290',
  },
  '9001': {
    name: '在カナダ日本国大使館',
    address: '255 Sussex Drive, Ottawa, Ontario K1N 9E6',
    phone: '+1-613-241-8541',
  },
  '0044': {
    name: '在英国日本国大使館',
    address: '101-104 Piccadilly, London W1J 7JT',
    phone: '+44-20-7465-6500',
  },
  '0033': {
    name: '在フランス日本国大使館',
    address: '7 Avenue Hoche, 75008 Paris',
    phone: '+33-1-48-88-62-00',
  },
};

// ============================================
// XML パーサー型定義
// ============================================

/**
 * 外務省オープンデータのXMLレスポンス構造（国別情報）
 * データフォーマット仕様に基づく
 * @see https://www.ezairyu.mofa.go.jp/html/opendata/index.html
 */
export interface MofaXmlResponse {
  /** 国・地域コード */
  countryCode?: string;
  /** 国・地域名 */
  countryName?: string;
  /** 危険レベル（1=該当あり、0=該当なし） */
  riskLevel1?: number; // 十分注意
  riskLevel2?: number; // 不要不急の渡航中止
  riskLevel3?: number; // 渡航中止勧告
  riskLevel4?: number; // 退避勧告
  /** 感染症危険レベル（1=該当あり、0=該当なし） */
  infectionLevel1?: number;
  infectionLevel2?: number;
  infectionLevel3?: number;
  infectionLevel4?: number;
  /** 危険情報日時 */
  riskLeaveDate?: string;
  /** 危険情報タイトル */
  riskTitle?: string;
  /** 危険情報リード */
  riskLead?: string;
  /** 危険情報概要 */
  riskSubText?: string;
  /** メール情報（配列または単一オブジェクト） */
  mail?: MofaMailEntry | MofaMailEntry[];
  /** 広域・スポット情報（配列または単一オブジェクト） */
  wideareaSpot?: MofaSpotEntry | MofaSpotEntry[];
}

interface MofaMailEntry {
  title?: string;
  lead?: string;
  mainText?: string;
  leaveDate?: string;
}

interface MofaSpotEntry {
  title?: string;
  lead?: string;
  mainText?: string;
  leaveDate?: {
    '#text'?: string;
  };
}

interface MofaOpendataResult {
  opendata: MofaXmlResponse;
}

// ============================================
// 設定インターフェース
// ============================================

/**
 * 外務省API設定
 */
export interface MofaApiConfig {
  /** APIエンドポイント（カスタム用、通常は不要） */
  endpoint?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** キャッシュマネージャー */
  cacheManager?: ICacheManager;
  /** キャッシュTTL（秒） */
  cacheTtlSeconds?: number;
}

// ============================================
// MofaApiSource クラス
// ============================================

/**
 * 外務省海外安全情報ソース
 * 外務省オープンデータAPIを使用して安全情報を取得
 */
export class MofaApiSource implements ITravelInfoSource<SafetyInfo> {
  readonly sourceName = '外務省海外安全情報';
  readonly sourceType: SourceType = 'official_api';
  readonly reliabilityScore = 95; // 公式情報のため高信頼性
  readonly supportedCategories: TravelInfoCategory[] = ['safety'];

  private readonly config: Required<
    Pick<MofaApiConfig, 'timeout' | 'cacheTtlSeconds'>
  > &
    Pick<MofaApiConfig, 'endpoint' | 'cacheManager'>;

  private readonly parser: XMLParser;

  constructor(config: MofaApiConfig = {}) {
    this.config = {
      endpoint: config.endpoint,
      timeout: config.timeout ?? DEFAULT_TIMEOUT_MS,
      cacheManager: config.cacheManager,
      cacheTtlSeconds: config.cacheTtlSeconds ?? CACHE_TTL_SECONDS,
    };

    // XMLパーサーの初期化
    this.parser = new XMLParser({
      ignoreAttributes: true, // 属性は基本的に不要（areaCdなど）
      parseTagValue: true,    // 数値の自動変換（0/1など）を有効化
      isArray: (name) => ['mail', 'wideareaSpot'].includes(name), // 配列として扱う要素
    });
  }

  /**
   * 安全情報を取得
   */
  async fetch(
    destination: string,
    options?: SourceOptions
  ): Promise<SourceResult<SafetyInfo>> {
    console.log(`[mofa-api] Fetching safety info for: ${destination}`);

    try {
      // 1. 目的地から国コードを取得
      let countryCode = this.resolveCountryCode(destination);

      // フォールバック: 指定された国名からコードを取得
      if (!countryCode && options?.country) {
        console.log(`[mofa-api] Destination code not found, trying country: ${options.country}`);
        countryCode = this.resolveCountryCode(options.country);
      }

      if (!countryCode) {
        console.warn(
          `[mofa-api] Unknown destination: ${destination}, falling back to next source`
        );
        // フォールバックを有効にするためにエラーを返す
        return {
          success: false,
          error: `Country code not found for: ${destination}`
        };
      }

      // 2. キャッシュをチェック
      const cacheKey = this.getCacheKey(countryCode);
      if (this.config.cacheManager) {
        const cached = await this.config.cacheManager.get<SafetyInfo>(cacheKey);
        if (cached) {
          console.log(`[mofa-api] Cache hit for: ${countryCode}`);
          return {
            success: true,
            data: cached.data,
            source: this.createSource(countryCode),
          };
        }
      }

      // 3. 外務省オープンデータからXMLを取得
      const safetyInfo = await this.fetchFromOpenData(
        countryCode,
        options?.timeout ?? this.config.timeout,
        destination
      );

      // 4. キャッシュに保存
      if (this.config.cacheManager && safetyInfo) {
        await this.config.cacheManager.set(cacheKey, safetyInfo, {
          ttlSeconds: this.config.cacheTtlSeconds,
        });
      }

      if (!safetyInfo) {
        console.warn(`[mofa-api] No safety info found for ${destination} (${countryCode})`);
        return {
          success: false,
          error: `Safety info not found for ${destination}`,
        };
      }

      const result: SourceResult<SafetyInfo> = {
        success: true,
        data: safetyInfo,
        source: this.createSource(countryCode),
      };
      // ログ出力は過剰なため省略（または要約のみ出力）
      console.log(`[mofa-api] Successfully fetched safety info for ${destination} (Level: ${safetyInfo.dangerLevel})`);
      return result;
    } catch (error) {
      console.error('[mofa-api] Error:', error);

      // エラーを伝播させてフォールバックチェーン（Gemini等）を有効にする
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ソースが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    // 事前チェックは行わず、fetch時のエラーハンドリングとリトライに任せる
    // 厳格なヘルスチェックによる誤検知（False Negative）を防ぐため常にtrueを返す
    return true;
  }

  // ============================================
  // プライベートメソッド
  // ============================================

  /**
   * 目的地名から国コードを解決
   */
  private resolveCountryCode(destination: string): string | null {
    // 1. 完全一致（日本語）
    if (DESTINATION_TO_COUNTRY_CODE[destination]) {
      return DESTINATION_TO_COUNTRY_CODE[destination];
    }

    // 2. 英語名からの解決（COUNTRY_CODE_TO_NAMEの逆引き）
    // Gemini等から英語の国名が渡される場合に対応（例: "United States" -> "0001"）
    // 注: COUNTRY_CODE_TO_NAME は "0001": "アメリカ" のようなマップ
    // 英語名を解決するには別途英語名マップが必要だが、簡易的に英語名対応を追加
    // 外務省オープンデータの国コード一覧に基づく英語名マッピング
    const englishToCode: Record<string, string> = {
      'United States': '1000', // 本土
      'United States of America': '1000',
      'USA': '1000',
      'America': '1000',
      'Hawaii': '1808', // 外務省コード: ハワイ
      'Canada': '9001', // 外務省コード
      'Korea': '0082',
      'South Korea': '0082',
      'Republic of Korea': '0082',
      'China': '0086',
      "People's Republic of China": '0086',
      'Taiwan': '0886',
      'Thailand': '0066',
      'Vietnam': '0084',
      'Viet Nam': '0084',
      'Singapore': '0065',
      'Malaysia': '0060',
      'Indonesia': '0062',
      'Philippines': '0063',
      'Cambodia': '0855',
      'India': '0091',
      'Australia': '0061',
      'New Zealand': '0064',
      'UK': '0044',
      'United Kingdom': '0044',
      'Great Britain': '0044',
      'France': '0033',
      'Germany': '0049',
      'Italy': '0039',
      'Spain': '0034',
      'Portugal': '0351',
      'Netherlands': '0031',
      'Belgium': '0032',
      'Switzerland': '0041',
      'Austria': '0043',
      'Czech Republic': '0420',
      'Czechia': '0420',
      'Poland': '0048',
      'Hungary': '0036',
      'Greece': '0030',
      'Turkey': '0090',
      'Türkiye': '0090',
      'Croatia': '0385',
      'Finland': '0358',
      'Sweden': '0046',
      'Norway': '0047',
      'Denmark': '0045',
      'Ireland': '0353',
      'Iceland': '0354',
      'Russia': '9007', // 外務省コード
      'Russian Federation': '9007',
      'Ukraine': '0380',
      'Mexico': '0052',
      'Brazil': '0055',
      'Argentina': '0054',
      'Peru': '0051',
      'Chile': '0056',
      'Cuba': '0053',
      'Costa Rica': '0506',
      'United Arab Emirates': '0971',
      'UAE': '0971',
      'Qatar': '0974',
      'Israel': '0972',
      'Jordan': '0962',
      'Oman': '0968',
      'Bahrain': '0973',
      'Kuwait': '0965',
      'Saudi Arabia': '0966',
      'Egypt': '0020',
      'Morocco': '0212',
      'South Africa': '0027',
      'Kenya': '0254',
      'Tanzania': '0255',
      'Ethiopia': '0251',
      'Ghana': '0233',
      'Nigeria': '0234',
      'Tunisia': '0216',
      'Senegal': '0221',
      'Guam': '1002', // 外務省コード
      'Saipan': '1001', // 外務省コード (北マリアナ諸島)
      'Northern Mariana Islands': '1001',
      'Fiji': '0679',
      'Palau': '0680',
      'French Polynesia': '9689', // 外務省コード (タヒチ)
      'Tahiti': '9689',
      'New Caledonia': '0687',
      'Hong Kong': '0852',
      'Macau': '0853',
      'Macao': '0853',
      'Myanmar': '0095',
      'Burma': '0095',
      'Laos': '0856',
      "Lao People's Democratic Republic": '0856',
      'Brunei': '0673',
      'Nepal': '0977',
      'Sri Lanka': '0094',
      'Bangladesh': '0880',
      'Pakistan': '0092',
      'Mongolia': '0976',
    };

    if (englishToCode[destination]) {
       return englishToCode[destination];
    }

    // 3. 部分一致（都市名から国を推測）
    const normalizedDest = destination
      .replace(/[（）()]/g, '')
      .replace(/\s+/g, '');

    for (const [key, code] of Object.entries(DESTINATION_TO_COUNTRY_CODE)) {
      if (
        normalizedDest.includes(key) ||
        key.includes(normalizedDest)
      ) {
        return code;
      }
    }

    return null;
  }

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(countryCode: string): string {
    return `mofa:safety:${countryCode}`;
  }

  /**
   * ソース情報を作成
   */
  private createSource(countryCode: string): TravelInfoSource {
    return {
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      sourceUrl: `${MOFA_ANZEN_BASE_URL}/info/pcinfectionspothazardinfo_${countryCode.replace(/^0+/, '')}.html`,
      retrievedAt: new Date(),
      reliabilityScore: this.reliabilityScore,
    };
  }

  /**
   * 外務省オープンデータからXMLを取得してパース
   */
  private async fetchFromOpenData(
    countryCode: string,
    timeout: number,
    destination: string
  ): Promise<SafetyInfo | null> {
    const url = `${MOFA_OPENDATA_BASE_URL}/country/${countryCode}A.xml`;
    console.log(`[mofa-api] Fetching: ${url}`);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/xml, text/xml',
            'User-Agent': 'AI-Travel-Planner/1.0',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`[mofa-api] Country not found: ${countryCode}`);
            return null;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xmlText = await response.text();

        // ログ出力を削除 (パフォーマンス改善)
        // console.log(`[mofa-api] Response for ${countryCode}:`, xmlText);

        // XMLかどうかチェック（HTMLエラーページの場合は弾く）
        if (!xmlText.trim().startsWith('<') || !xmlText.includes('<opendata')) {
          throw new Error(`Invalid XML response for ${countryCode}`);
        }

        // Pre-process XML to remove large <mainText> blocks which are unused but consume massive memory
        // This solves the "XML too long" issue (e.g. USA is 2.7MB with mainText, much smaller without)
        const cleanXmlText = xmlText.replace(/<mainText>[\s\S]*?<\/mainText>/g, '');

        return await this.parseXmlResponse(cleanXmlText, countryCode, destination);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `[mofa-api] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`,
          lastError.message
        );

        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    throw new TravelInfoServiceError(
      'NETWORK_ERROR',
      `Failed to fetch MOFA data after ${MAX_RETRIES + 1} attempts`,
      this.sourceName,
      lastError ?? undefined
    );
  }

  /**
   * XMLレスポンスをパースしてSafetyInfoに変換
   */
  private async parseXmlResponse(
    xmlText: string,
    countryCode: string,
    destination: string
  ): Promise<SafetyInfo> {
    try {
      const result = this.parser.parse(xmlText) as MofaOpendataResult;
      const opendata = result.opendata;

      if (!opendata) {
        throw new Error('Invalid XML structure: missing opendata');
      }

      const dangerLevel = this.extractDangerLevel(opendata);
      const warnings = this.extractWarnings(opendata);

      // 追加情報の抽出
      const lead = opendata.riskLead?.trim();
      const subText = opendata.riskSubText?.trim();

      // 目的地の特定危険レベルを判定
      let specificDangerLevel = dangerLevel;
      let maxCountryLevel = dangerLevel;
      let isPartialCountryRisk = false;
      let highRiskRegions: HighRiskRegion[] | undefined;

      const countryName = COUNTRY_CODE_TO_NAME[countryCode];

      // 危険レベルが1以上の場合、AIを使用して主要観光地のレベルを判定
      // 国名で検索された場合も、主要観光地（首都など）のレベルを表示する
      if (dangerLevel > 0 && countryName) {
        // 目的地が国名の場合は、「主要観光地・首都」として扱う
        const targetDestination = (destination === countryName || destination.includes(countryName))
          ? `${countryName}の主要観光地（首都など）`
          : destination;

        // AIを使用して特定レベルを判定
        try {
          const aiResult = await this.determineRiskWithAI(
            (lead || '') + '\n' + (subText || ''),
            targetDestination,
            countryName,
            dangerLevel
          );

          if (aiResult) {
            specificDangerLevel = aiResult.specificLevel as DangerLevel;
            maxCountryLevel = aiResult.maxCountryLevel as DangerLevel;

            // 高リスク地域の情報を設定
            if (aiResult.highRiskRegions && aiResult.highRiskRegions.length > 0) {
              highRiskRegions = aiResult.highRiskRegions.map(region => ({
                regionName: region.regionName,
                level: region.level as DangerLevel,
                description: region.description,
              }));
            }

            console.log(`[mofa-api] AI Determined Risk for ${destination}: ${specificDangerLevel} (Country Max: ${maxCountryLevel}, High Risk Regions: ${highRiskRegions?.length || 0})`);
          } else {
            // AI判定がnullの場合（APIキーがないなど）
            // ヒューリスティックで判定
            const isCountrySearch = destination === countryName || destination.includes(countryName) || targetDestination.includes('主要観光地');
            const combinedText = (lead || '') + (subText || '');
            const wholeCountryKeywords = ['全土', '全域', '国全土', '国内全域'];
            const hasWholeCountryKeyword = wholeCountryKeywords.some(keyword => combinedText.includes(keyword));

            if (isCountrySearch) {
              // 国名検索の場合：安全のため最大レベルを使用
              console.log(`[mofa-api] AI null (country search), using max level for ${destination}: ${maxCountryLevel}`);
              specificDangerLevel = maxCountryLevel;
            } else if (hasWholeCountryKeyword) {
              // 「全土」キーワードがある場合：最大レベルを適用
              console.log(`[mofa-api] AI null (whole country keyword found), using max level for ${destination}: ${maxCountryLevel}`);
              specificDangerLevel = maxCountryLevel;
            } else if (combinedText.includes(destination)) {
              // テキストに目的地が含まれている場合：最大レベルを適用（安全サイド）
              console.log(`[mofa-api] AI null (destination mentioned in text), using max level for ${destination}: ${maxCountryLevel}`);
              specificDangerLevel = maxCountryLevel;
            } else {
              // 都市検索でテキストに言及がない場合：安全（レベル0）とみなす
              console.log(`[mofa-api] AI null (city not in text), assuming safe for ${destination}: 0`);
              specificDangerLevel = 0;
            }
          }
        } catch (e) {
          console.warn('[mofa-api] AI analysis failed:', e);
          // AI判定失敗時もヒューリスティックで判定
          const isCountrySearch = destination === countryName || destination.includes(countryName) || targetDestination.includes('主要観光地');
          const combinedText = (lead || '') + (subText || '');
          const wholeCountryKeywords = ['全土', '全域', '国全土', '国内全域'];
          const hasWholeCountryKeyword = wholeCountryKeywords.some(keyword => combinedText.includes(keyword));

          if (isCountrySearch || hasWholeCountryKeyword || combinedText.includes(destination)) {
            specificDangerLevel = maxCountryLevel;
          } else {
            specificDangerLevel = 0;
          }
        }
      }

      // 部分的リスクフラグ（表示制御用）
      isPartialCountryRisk = specificDangerLevel < maxCountryLevel;

      return {
        dangerLevel: specificDangerLevel,
        maxCountryLevel,
        dangerLevelDescription: DANGER_LEVEL_DESCRIPTIONS[specificDangerLevel],
        lead,
        subText,
        isPartialCountryRisk,
        highRiskRegions,
        warnings,
        emergencyContacts:
          EMERGENCY_CONTACTS_BY_COUNTRY[countryCode] ||
          this.getDefaultEmergencyContacts(),
        nearestEmbassy: EMBASSIES_BY_COUNTRY[countryCode],
      };
    } catch (e) {
      console.error('[mofa-api] XML Parse Error:', e);
      throw e; // Throw error to trigger fallback in fetch
    }
  }

  /**
   * AI分析結果の型
   */
  private aiResultSchema = z.object({
    specificLevel: z.number().min(0).max(4).describe('The danger level (0-4) specifically for the target destination.'),
    maxCountryLevel: z.number().min(0).max(4).describe('The maximum danger level mentioned for the entire country.'),
    highRiskRegions: z.array(z.object({
      regionName: z.string().describe('Name of the high-risk region in Japanese.'),
      level: z.number().min(1).max(4).describe('Danger level for this region.'),
      description: z.string().optional().describe('Brief description of the risk in Japanese.'),
    })).describe('List of regions with danger levels higher than the target destination. Only include regions explicitly mentioned in the text with specific danger levels.'),
    reason: z.string().describe('The reasoning for the decision.'),
  });

  /**
   * AIを使用してリスクレベルを判定
   */
  private async determineRiskWithAI(
    text: string,
    destination: string,
    country: string,
    xmlMaxLevel: number
  ): Promise<{
    specificLevel: number;
    maxCountryLevel: number;
    highRiskRegions?: Array<{ regionName: string; level: number; description?: string }>;
  } | null> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return null;

    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const modelName = process.env.GOOGLE_MODEL_NAME || 'gemini-2.5-flash';

      const prompt = `
        You are a travel safety analyst. Analyze the following safety information text from the Ministry of Foreign Affairs of Japan (MOFA).

        Information Source: MOFA Open Data
        Country: ${country}
        Target Destination: ${destination}
        MOFA XML Reported Max Level: ${xmlMaxLevel}

        Text (Lead & SubText):
        """
        ${text}
        """

        Task:
        1. Determine the specific danger level (0-4) for the 'Target Destination' based on the text.
           - Level 0: No danger information (危険情報なし)
           - Level 1: Exercise caution (十分注意してください)
           - Level 2: Avoid non-essential travel (不要不急の渡航は止めてください)
           - Level 3: Do not travel (渡航は止めてください)
           - Level 4: Evacuate (退避してください)

           **IMPORTANT RULES for determining the level:**
           - If the target is "主要観光地（首都など）" or a major city like New Delhi, Bangkok, Cairo, etc., find the level that applies to that specific area.
           - If the text explicitly mentions "全土" (whole country) with a level, apply that level.
           - If the text specifies high risks for border regions, conflict zones, or specific dangerous areas, but does NOT mention the capital/major tourist cities, assume major tourist areas are safer (often Level 0 or 1).
           - Example: India may have Level 4 for Kashmir region, Level 3 for some northeastern states, but New Delhi and major tourist cities like Jaipur, Agra are typically Level 1.

        2. Determine the maximum danger level mentioned for the entire country.

        3. Extract high-risk regions that have danger levels HIGHER than the target destination.
           - Only include regions explicitly mentioned in the text with specific danger levels.
           - Provide the region name in Japanese.
           - Include a brief description of the risk.
           - If the target destination's level equals the max level, return an empty array.

        Constraint:
        - The 'maxCountryLevel' should generally match or exceed the 'specificLevel'.
        - For ambiguous cases about tourist areas, prefer the LOWER (safer) level - tourists typically visit safe areas.
        - Only list high-risk regions if they have a HIGHER level than the target destination.
      `;

      const { object } = await generateObject({
        model: google(modelName),
        schema: this.aiResultSchema,
        prompt,
      });

      return {
        specificLevel: object.specificLevel,
        maxCountryLevel: object.maxCountryLevel,
        highRiskRegions: object.highRiskRegions.length > 0 ? object.highRiskRegions : undefined,
      };
    } catch (error) {
      console.error('[mofa-api] AI determination error:', error);
      return null;
    }
  }

  /**
   * XMLオブジェクトから危険度レベルを抽出
   */
  private extractDangerLevel(opendata: MofaXmlResponse): DangerLevel {
    // 1(該当あり)か0(該当なし)かチェック
    // XMLParserの設定(parseTagValue: true)により数値として取得される想定

    // 退避勧告が最優先
    if (opendata.riskLevel4 === 1) return 4;
    if (opendata.riskLevel3 === 1) return 3;
    if (opendata.riskLevel2 === 1) return 2;
    if (opendata.riskLevel1 === 1) return 1;

    // 全て0または未定義の場合はレベル0（危険情報なし）
    return 0;
  }

  /**
   * XMLオブジェクトから感染症危険度レベルを抽出
   */
  private extractInfectionLevel(opendata: MofaXmlResponse): DangerLevel {
    if (opendata.infectionLevel4 === 1) return 4;
    if (opendata.infectionLevel3 === 1) return 3;
    if (opendata.infectionLevel2 === 1) return 2;
    if (opendata.infectionLevel1 === 1) return 1;

    return 0;
  }

  /**
   * XMLオブジェクトから警告情報を抽出
   */
  private extractWarnings(opendata: MofaXmlResponse): string[] {
    const warnings: string[] = [];

    // 1. 危険情報のリード（riskLead）
    if (opendata.riskLead && typeof opendata.riskLead === 'string') {
      const lead = opendata.riskLead.trim();
      if (lead.length > 0) {
        warnings.push(lead);
      }
    }

    // 2. 広域・スポット情報のタイトルとリード
    // isArray設定により、wideareaSpotは常に配列として扱われる
    if (Array.isArray(opendata.wideareaSpot)) {
      for (const spot of opendata.wideareaSpot) {
        if (warnings.length >= 5) break;

        if (spot.title) {
          const title = spot.title.trim();
          if (title && !warnings.includes(title)) {
            warnings.push(title);
          }
        }
      }
    }

    // 3. メール情報のタイトル
    // isArray設定により、mailは常に配列として扱われる
    if (Array.isArray(opendata.mail)) {
      for (const mail of opendata.mail) {
        if (warnings.length >= 5) break;

        if (mail.title) {
          const title = mail.title.trim();
          if (title && !warnings.includes(title)) {
            warnings.push(title);
          }
        }
      }
    }

    // 警告がない場合は一般的な注意事項を追加
    if (warnings.length === 0) {
      warnings.push('最新の渡航情報を確認してください');
      warnings.push('海外旅行保険への加入を推奨します');
    }

    return warnings.slice(0, 5); // 最大5件
  }

  /**
   * デフォルトの緊急連絡先を取得
   */
  private getDefaultEmergencyContacts(): EmergencyContact[] {
    return [
      { name: '外務省領事サービスセンター', number: '+81-3-5501-8162' },
      {
        name: '在外公館連絡先検索',
        number: 'https://www.mofa.go.jp/mofaj/annai/zaigai/',
      },
    ];
  }

  /**
   * デフォルトの安全情報を返す
   * APIからデータを取得できない場合のフォールバック
   * 危険レベルは0（危険情報なし）として扱う
   */
  private getDefaultSafetyInfo(
    destination: string
  ): SourceResult<SafetyInfo> {
    console.log(`[mofa-api] Using default safety info for: ${destination}`);

    const defaultInfo: SafetyInfo = {
      dangerLevel: 0,
      dangerLevelDescription: DANGER_LEVEL_DESCRIPTIONS[0],
      warnings: [
        '最新の渡航情報は外務省海外安全ホームページでご確認ください',
        '海外旅行保険への加入を強くお勧めします',
        '「たびレジ」への登録をお勧めします',
      ],
      emergencyContacts: this.getDefaultEmergencyContacts(),
    };

    return {
      success: true,
      data: defaultInfo,
      source: {
        sourceType: 'ai_generated', // フォールバックのため
        sourceName: `${this.sourceName}（デフォルト）`,
        sourceUrl: MOFA_ANZEN_BASE_URL,
        retrievedAt: new Date(),
        reliabilityScore: 50, // デフォルトデータは信頼性低め
      },
    };
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// ファクトリ関数
// ============================================

/**
 * 外務省APIソースのファクトリ関数
 */
export function createMofaApiSource(config?: MofaApiConfig): MofaApiSource {
  return new MofaApiSource(config);
}

// ============================================
// ユーティリティ関数（エクスポート）
// ============================================

/**
 * 目的地から国コードを取得
 */
export function getCountryCodeByDestination(destination: string): string | null {
  if (DESTINATION_TO_COUNTRY_CODE[destination]) {
    return DESTINATION_TO_COUNTRY_CODE[destination];
  }

  const normalizedDest = destination
    .replace(/[（）()]/g, '')
    .replace(/\s+/g, '');

  for (const [key, code] of Object.entries(DESTINATION_TO_COUNTRY_CODE)) {
    if (normalizedDest.includes(key) || key.includes(normalizedDest)) {
      return code;
    }
  }

  return null;
}

/**
 * 国コードから国名を取得
 */
export function getCountryNameByCode(countryCode: string): string | null {
  return COUNTRY_CODE_TO_NAME[countryCode] || null;
}

/**
 * 対応している目的地一覧を取得
 */
export function getSupportedDestinations(): string[] {
  return Object.keys(DESTINATION_TO_COUNTRY_CODE);
}

/**
 * 国コードの緊急連絡先を取得
 */
export function getEmergencyContactsByCode(
  countryCode: string
): EmergencyContact[] | null {
  return EMERGENCY_CONTACTS_BY_COUNTRY[countryCode] || null;
}

/**
 * 国コードの大使館情報を取得
 */
export function getEmbassyByCode(countryCode: string): Embassy | null {
  return EMBASSIES_BY_COUNTRY[countryCode] || null;
}
