/**
 * Few-shot examples for better AI output quality
 * Good/Bad examples to guide the AI
 */

// ============================================
// Description Examples
// ============================================

export const DESCRIPTION_EXAMPLES = {
  good: [
    {
      context: '京都 2泊3日 カップル',
      example: '千年の都で紡ぐ、ふたりだけの物語。朝靄に包まれた嵐山の竹林から、夕暮れの祇園白川まで——古都の美しさに寄り添いながら、ゆっくりと流れる時間を愉しむ旅。',
    },
    {
      context: 'バリ島 4泊5日 友人グループ',
      example: 'ターコイズブルーの海と、緑深いライステラス。バリの二つの顔を味わい尽くすアドベンチャー。昼はサーフィンとスパ、夜はビーチクラブで乾杯——最高の仲間と過ごす、忘れられない5日間。',
    },
    {
      context: '北海道 3泊4日 家族（子供あり）',
      example: '子どもたちの歓声が雪原に響く、冬の北海道ファミリーアドベンチャー。ふわふわパウダースノーでの雪遊びから、動物たちとの触れ合い、そして夜は満天の星空を見上げて——家族の絆が深まる特別な冬休み。',
    },
  ],
  bad: [
    {
      context: '京都 2泊3日 カップル',
      example: '京都への2泊3日の旅行プランです。有名な観光スポットを効率よく回ります。',
      problem: '感情や雰囲気が伝わらない、事務的な文章',
    },
    {
      context: 'バリ島 4泊5日 友人グループ',
      example: 'バリ島を訪れる4泊5日の旅程です。ビーチや寺院、ショッピングを楽しめます。',
      problem: 'どこにでも当てはまる一般的すぎる説明',
    },
  ],
};

// ============================================
// Activity Description Examples
// ============================================

export const ACTIVITY_DESCRIPTION_EXAMPLES = {
  good: [
    {
      activity: '金閣寺',
      example: '朝一番の訪問がおすすめ。水面に映る黄金の楼閣は、朝日を受けてひときわ輝きます。人気の撮影スポットは鏡湖池のほとり——紅葉の季節は特に息をのむ美しさ。',
    },
    {
      activity: '築地場外市場で朝食',
      example: '活気あふれる市場の朝。「寿司大」の行列は覚悟の上で——獲れたてのネタが光る江戸前寿司は、早起きの価値あり。厚焼き玉子の食べ歩きも忘れずに。',
    },
    {
      activity: 'ウブドのライステラス',
      example: 'テガラランのライステラスは午前中の訪問がベスト。段々畑が朝日に照らされ、緑のグラデーションが広がります。テラス沿いのカフェでバリコーヒーを片手に、この絶景を独り占め。',
    },
  ],
  bad: [
    {
      activity: '金閣寺',
      example: '金閣寺を見学します。',
      problem: '何も伝わらない最低限の説明',
    },
    {
      activity: '築地場外市場で朝食',
      example: '築地市場で新鮮な海鮮を食べることができます。',
      problem: '具体性がなく、どの店かも分からない',
    },
  ],
};

// ============================================
// Day Title Examples
// ============================================

export const DAY_TITLE_EXAMPLES = {
  good: [
    { context: '東京 Day1 浅草・スカイツリー', example: '下町情緒と未来が交差する一日' },
    { context: '京都 Day2 嵐山', example: '竹の音に導かれて、嵐山散策' },
    { context: 'ハワイ Day3 ノースショア', example: 'サーファーの聖地、ノースショアへ' },
    { context: 'パリ Day1 モンマルトル', example: '芸術の丘モンマルトルで、パリジャン気分' },
  ],
  bad: [
    { context: '東京 Day1', example: '1日目', problem: '情報量ゼロ' },
    { context: '京都 Day2', example: '観光', problem: '何も伝わらない' },
  ],
};

// ============================================
// Transit Description Examples
// ============================================

export const TRANSIT_EXAMPLES = {
  good: [
    {
      type: 'train',
      route: '東京 → 京都',
      example: {
        type: 'train',
        departure: { place: '東京駅', time: '08:30' },
        arrival: { place: '京都駅', time: '10:45' },
        duration: '2h 15m',
        memo: '東海道新幹線のぞみ号。富士山は進行方向右側の窓から',
      },
    },
    {
      type: 'flight',
      route: '東京 → バリ',
      example: {
        type: 'flight',
        departure: { place: '成田空港', time: '10:00' },
        arrival: { place: 'ングラ・ライ国際空港', time: '16:30' },
        duration: '7h 30m',
        memo: 'GA885便 直行便',
      },
    },
  ],
};

// ============================================
// Few-shot prompt builder
// ============================================

export function buildFewShotExamples(type: 'description' | 'activity' | 'title'): string {
  const examples = {
    description: DESCRIPTION_EXAMPLES,
    activity: ACTIVITY_DESCRIPTION_EXAMPLES,
    title: DAY_TITLE_EXAMPLES,
  };

  const data = examples[type];

  let prompt = `
# FEW-SHOT EXAMPLES（参考にすること）

## GOOD EXAMPLES（このような出力を目指す）
`;

  for (const good of data.good) {
    if ('context' in good && 'example' in good) {
      prompt += `
- Context: ${good.context}
  Output: "${good.example}"
`;
    }
  }

  prompt += `
## BAD EXAMPLES（このような出力は避ける）
`;

  for (const bad of data.bad) {
    if ('context' in bad && 'example' in bad && 'problem' in bad) {
      prompt += `
- Context: ${bad.context}
  Output: "${bad.example}"
  Problem: ${bad.problem}
`;
    }
  }

  return prompt;
}

/**
 * Get comprehensive examples prompt for itinerary generation
 */
export function getItineraryExamplesPrompt(): string {
  return `
${buildFewShotExamples('description')}

${buildFewShotExamples('activity')}

${buildFewShotExamples('title')}
`;
}
