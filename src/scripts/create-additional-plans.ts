
import fs from 'fs';
import path from 'path';

// Helper to generate IDs
const generateId = (prefix: string, ...parts: string[]) => {
  return [prefix, ...parts].map(s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')).join('-');
};

// Fan Categories
const fanCategories = [
  { topic: 'Disney', spots: ['Anaheim', 'Orlando', 'Paris', 'Shanghai', 'HongKong'] },
  { topic: 'Universal', spots: ['Orlando', 'Hollywood', 'Singapore'] },
  { topic: 'HarryPotter', spots: ['London', 'Oxford', 'Edinburgh', 'NewYork'] },
  { topic: 'LordOfTheRings', spots: ['Matamata', 'Queenstown', 'Wellington'] },
  { topic: 'GameOfThrones', spots: ['Dubrovnik', 'NorthernIreland', 'Iceland'] },
  { topic: 'K-Pop', spots: ['Seoul', 'Busan'] },
  { topic: 'Sherlock', spots: ['London'] },
  { topic: 'Beatles', spots: ['Liverpool', 'London'] },
  { topic: 'F1', spots: ['Monaco', 'Silverstone', 'Monza', 'Singapore', 'Suzuka', 'AbuDhabi'] }, // Suzuka is domestic but others are overseas
  { topic: 'PremierLeague', spots: ['Manchester', 'London', 'Liverpool'] },
  { topic: 'LaLiga', spots: ['Barcelona', 'Madrid'] },
  { topic: 'MLB', spots: ['LosAngeles', 'NewYork', 'Boston', 'Chicago'] },
  { topic: 'NBA', spots: ['LosAngeles', 'SanFrancisco', 'NewYork'] },
  { topic: 'Art', spots: ['Paris', 'Amsterdam', 'Florence', 'NewYork', 'Vienna'] },
  { topic: 'Architecture', spots: ['Barcelona', 'Rome', 'Chicago', 'Dubai'] },
  { topic: 'History', spots: ['Cairo', 'Athens', 'Rome', 'Istanbul'] },
  { topic: 'Ghibli', spots: ['Taipei'] }, // Jiufen
  { topic: 'StarWars', spots: ['Tunisia', 'Ireland'] },
  { topic: 'Marvel', spots: ['NewYork', 'Atlanta'] },
  { topic: 'Friends', spots: ['NewYork'] },
  { topic: 'SexAndTheCity', spots: ['NewYork'] },
  { topic: 'EmilyInParis', spots: ['Paris'] },
  { topic: 'CrashLandingOnYou', spots: ['Switzerland'] },
  { topic: 'ClassicalMusic', spots: ['Vienna', 'Salzburg', 'Prague'] },
  { topic: 'Jazz', spots: ['NewOrleans', 'NewYork'] },
];

// General Destinations (Overseas)
const generalDestinations = [
  // Asia
  { name: 'Taipei', region: 'Asia' }, { name: 'Seoul', region: 'Asia' }, { name: 'Bangkok', region: 'Asia' },
  { name: 'Singapore', region: 'Asia' }, { name: 'Bali', region: 'Asia' }, { name: 'Cebu', region: 'Asia' },
  { name: 'Hanoi', region: 'Asia' }, { name: 'Ho Chi Minh', region: 'Asia' }, { name: 'Phuket', region: 'Asia' },
  { name: 'Kuala Lumpur', region: 'Asia' }, { name: 'Hong Kong', region: 'Asia' }, { name: 'Siem Reap', region: 'Asia' },
  // Europe
  { name: 'Paris', region: 'Europe' }, { name: 'London', region: 'Europe' }, { name: 'Rome', region: 'Europe' },
  { name: 'Barcelona', region: 'Europe' }, { name: 'Milan', region: 'Europe' }, { name: 'Venice', region: 'Europe' },
  { name: 'Florence', region: 'Europe' }, { name: 'Amsterdam', region: 'Europe' }, { name: 'Vienna', region: 'Europe' },
  { name: 'Prague', region: 'Europe' }, { name: 'Budapest', region: 'Europe' }, { name: 'Berlin', region: 'Europe' },
  { name: 'Munich', region: 'Europe' }, { name: 'Zurich', region: 'Europe' }, { name: 'Lisbon', region: 'Europe' },
  { name: 'Porto', region: 'Europe' }, { name: 'Madrid', region: 'Europe' }, { name: 'Athens', region: 'Europe' },
  { name: 'Santorini', region: 'Europe' }, { name: 'Dubrovnik', region: 'Europe' }, { name: 'Helsinki', region: 'Europe' },
  { name: 'Stockholm', region: 'Europe' }, { name: 'Copenhagen', region: 'Europe' }, { name: 'Reykjavik', region: 'Europe' },
  // North America
  { name: 'New York', region: 'North America' }, { name: 'Los Angeles', region: 'North America' },
  { name: 'San Francisco', region: 'North America' }, { name: 'Las Vegas', region: 'North America' },
  { name: 'Orlando', region: 'North America' }, { name: 'Honolulu', region: 'North America' },
  { name: 'Vancouver', region: 'North America' }, { name: 'Toronto', region: 'North America' },
  { name: 'Banff', region: 'North America' }, { name: 'Cancun', region: 'North America' },
  // Oceania
  { name: 'Sydney', region: 'Oceania' }, { name: 'Melbourne', region: 'Oceania' }, { name: 'Gold Coast', region: 'Oceania' },
  { name: 'Cairns', region: 'Oceania' }, { name: 'Auckland', region: 'Oceania' }, { name: 'Queenstown', region: 'Oceania' },
  { name: 'Fiji', region: 'Oceania' }, { name: 'Tahiti', region: 'Oceania' },
  // Middle East / Africa
  { name: 'Dubai', region: 'Middle East' }, { name: 'Istanbul', region: 'Middle East' }, { name: 'Cairo', region: 'Africa' },
  { name: 'Marrakech', region: 'Africa' }, { name: 'Cape Town', region: 'Africa' },
  // South America
  { name: 'Cusco', region: 'South America' }, { name: 'Lima', region: 'South America' },
  { name: 'Rio de Janeiro', region: 'South America' }, { name: 'Buenos Aires', region: 'South America' },
];

const themes = ['グルメ', 'ショッピング', '自然・絶景', '文化・歴史', 'リゾート', 'アート・美術館', 'リラックス', 'アクティビティ'];
const companions = ['友人', 'カップル・夫婦', '家族（子供あり）', '家族（大人のみ）', '一人旅'];
const budgets = ['安め', '中程度', '高め'];
const paces = ['ゆっくり', '普通', 'アクティブ'];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSubset<T>(arr: T[], min: number, max: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * (max - min + 1)) + min);
}

function generateSamplePlans() {
  const plans: Record<string, unknown>[] = [];
  const existingIds = new Set<string>();

  // 1. Generate 100 Fan Plans
  let fanCount = 0;
  while (fanCount < 100) {
    const category = getRandom(fanCategories);
    const spot = getRandom(category.spots);

    // Skip Japanese spots if any slipped in (though list looks clean mostly, verify Suzuka)
    if (spot === 'Suzuka') continue;

    const id = generateId('fan', category.topic, spot, Math.random().toString(36).substring(7));
    if (existingIds.has(id)) continue;

    const days = Math.floor(Math.random() * 5) + 3; // 3 to 7 days
    const companion = getRandom(companions);

    plans.push({
      id,
      title: `【推し活】${category.topic}の聖地を巡る ${spot}への旅`,
      description: `${category.topic}ファン必見！${spot}で聖地巡礼を楽しむ${days}日間の旅。ファンのための特別プランです。`,
      input: {
        destinations: [spot],
        isDestinationDecided: true,
        region: 'overseas',
        dates: `${days - 1}泊${days}日`,
        companions: companion,
        theme: ['推し活', '文化・歴史', ...getRandomSubset(themes, 1, 2)],
        budget: getRandom(budgets),
        pace: getRandom(paces),
        freeText: `${category.topic}の関連スポットを巡りたい！ファングッズも買いたいです。`,
      },
      createdAt: new Date().toISOString().split('T')[0],
      tags: ['推し活', category.topic, spot, '海外', companion],
    });

    existingIds.add(id);
    fanCount++;
  }

  // 2. Generate 200 General Plans
  let generalCount = 0;
  while (generalCount < 200) {
    const dest = getRandom(generalDestinations);
    const id = generateId('gen', dest.name, Math.random().toString(36).substring(7));
    if (existingIds.has(id)) continue;

    const days = Math.floor(Math.random() * 5) + 3; // 3 to 7 days
    const companion = getRandom(companions);
    const selectedThemes = getRandomSubset(themes, 2, 4);

    plans.push({
      id,
      title: `${dest.name} ${selectedThemes[0]}と${selectedThemes[1]}の旅`,
      description: `${dest.name}で${selectedThemes.join('、')}を満喫する${days}日間。${companion}におすすめの定番コース。`,
      input: {
        destinations: [dest.name],
        isDestinationDecided: true,
        region: 'overseas',
        dates: `${days - 1}泊${days}日`,
        companions: companion,
        theme: selectedThemes,
        budget: getRandom(budgets),
        pace: getRandom(paces),
        freeText: `${dest.name}の観光名所を巡りつつ、${selectedThemes[0]}も楽しみたい。`,
      },
      createdAt: new Date().toISOString().split('T')[0],
      tags: [dest.name, dest.region, '海外', ...selectedThemes, companion],
    });

    existingIds.add(id);
    generalCount++;
  }

  return plans;
}

const plans = generateSamplePlans();

const fileContent = `import { SamplePlan } from "./sample-plans";

export const additionalSamplePlans: SamplePlan[] = ${JSON.stringify(plans, null, 2)};
`;

fs.writeFileSync(path.join(process.cwd(), 'src/lib/additional-sample-plans.ts'), fileContent);
console.log(`Generated ${plans.length} plans.`);
