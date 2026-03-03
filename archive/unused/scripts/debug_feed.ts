
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPublicFeed() {
  console.log("Checking `plan_publications` table...");
  const { data: pubs, error: pubError, count: pubCount } = await supabase
    .from('plan_publications')
    .select('*', { count: 'exact' })
    .eq('visibility', 'public');

  if (pubError) {
    console.error("Error fetching pubs:", pubError);
  } else {
    console.log(`Found ${pubCount} public publications.`);
    if (pubs && pubs.length > 0) {
        console.log("Sample Pub:", pubs[0]);
    }
  }

  console.log("\nChecking `plans` table for is_public=true...");
  const { data: plans, error: planError, count: planCount } = await supabase
    .from('plans')
    .select('id, is_public, destination', { count: 'exact' })
    .eq('is_public', true);

  if (planError) {
    console.error("Error fetching plans:", planError);
  } else {
    console.log(`Found ${planCount} public plans in plans table.`);
    if (plans && plans.length > 0) {
        console.log("Sample Plan:", plans[0]);
    }
  }
}

checkPublicFeed();
