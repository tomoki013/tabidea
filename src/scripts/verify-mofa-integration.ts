
import { createDefaultTravelInfoService } from '@/lib/travel-info';
import { TravelInfoCategory, SafetyInfo } from '@/lib/types/travel-info';

async function verify() {
  const service = createDefaultTravelInfoService();
  const destination = 'パリ'; // Known mapping to France (0033)
  const categories: TravelInfoCategory[] = ['safety'];

  console.log(`Fetching info for ${destination}...`);

  // Test with country context to verify our fix for index.ts
  const response = await service.getInfo(destination, categories, {
      country: 'フランス'
  });

  const safetyData = response.categories.get('safety');

  if (!safetyData) {
    console.error('Safety data not found!');
    process.exit(1);
  }

  console.log('Source Type:', safetyData.source.sourceType);
  console.log('Source Name:', safetyData.source.sourceName);

  if (safetyData.category === 'safety') {
    const data = safetyData.data as SafetyInfo;
    console.log('Danger Level:', data.dangerLevel);
  }

  if (safetyData.source.sourceType === 'official_api' && safetyData.source.sourceName.includes('外務省')) {
    console.log('SUCCESS: MOFA API is being used.');
  } else {
    console.error('FAILURE: MOFA API is NOT being used.');
    console.log('Actual Source:', safetyData.source);
    process.exit(1);
  }
}

verify().catch(console.error);
