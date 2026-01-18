import { createMofaApiSource } from '../lib/travel-info/sources/mofa-api';

async function verify() {
  console.log('Verifying MofaApiSource modification...');

  const source = createMofaApiSource();

  // Test isAvailable
  console.log('Testing isAvailable()...');
  const start = Date.now();
  const available = await source.isAvailable();
  const elapsed = Date.now() - start;

  if (available !== true) {
    console.error('FAILED: isAvailable() returned false');
    process.exit(1);
  }

  if (elapsed > 100) {
    console.warn(`WARNING: isAvailable() took ${elapsed}ms. It should be instant.`);
  } else {
    console.log(`PASSED: isAvailable() returned true instantly (${elapsed}ms)`);
  }

  // Test fetch (ensure no regression)
  console.log('Testing fetch("タイ")...');
  try {
    const result = await source.fetch('タイ');
    if (result.success) {
      console.log('PASSED: fetch("タイ") succeeded');
      console.log(`Danger Level: ${result.data?.dangerLevel}`);
      console.log(`Source Name: ${result.source?.sourceName}`);
    } else {
      console.error('FAILED: fetch("タイ") returned success=false');
      console.error(result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('FAILED: fetch("タイ") threw an error');
    console.error(error);
    process.exit(1);
  }
}

verify();
