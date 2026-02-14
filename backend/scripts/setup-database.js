import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.service_role_key
);

async function setupDatabase() {
  console.log('🔧 Setting up Supabase database...\n');

  try {
    // Read SQL file
    const sqlFile = join(__dirname, '..', 'supabase-schema.sql');
    const sql = readFileSync(sqlFile, 'utf-8');

    console.log('📄 Executing SQL schema...');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (error && !error.message.includes('already exists')) {
          console.warn('⚠️  Warning:', error.message);
        }
      }
    }

    console.log('✅ Database schema created successfully!\n');

    // Verify tables exist
    console.log('🔍 Verifying tables...');
    
    const { data: versions, error: vError } = await supabase
      .from('agent_versions')
      .select('*')
      .limit(1);

    const { data: calls, error: cError } = await supabase
      .from('calls')
      .select('*')
      .limit(1);

    if (vError) {
      console.error('❌ Error accessing agent_versions:', vError.message);
      console.log('\n⚠️  Please run the SQL file manually in Supabase SQL Editor:');
      console.log('   1. Go to https://supabase.com/dashboard/project/[your-project]/sql');
      console.log('   2. Copy the contents of backend/supabase-schema.sql');
      console.log('   3. Paste and run it\n');
      return;
    }

    if (cError) {
      console.error('❌ Error accessing calls:', cError.message);
      console.log('\n⚠️  Please run the SQL file manually in Supabase SQL Editor\n');
      return;
    }

    console.log('✅ Tables verified successfully!\n');

    // Check if baseline version exists
    const { data: baselineVersion } = await supabase
      .from('agent_versions')
      .select('*')
      .eq('version', 'v1.0')
      .single();

    if (baselineVersion) {
      console.log('✅ Baseline strategy (v1.0) already exists');
      console.log(`   Total calls: ${baselineVersion.total_calls}`);
      console.log(`   Conversion rate: ${(baselineVersion.conversion_rate * 100).toFixed(1)}%\n`);
    } else {
      console.log('⚠️  Baseline strategy not found. Creating v1.0...');
      
      const { data: newVersion, error: insertError } = await supabase
        .from('agent_versions')
        .insert({
          version: 'v1.0',
          strategy_json: {
            version: 'v1.0',
            description: 'Baseline real estate agent - conversational and professional',
            opening: {
              greeting: 'Hi! This is Sarah calling from Premier Realty. How are you doing today?',
              intro: 'I saw you expressed interest in viewing properties in the area. I have some amazing listings that just came on the market that I think you would love.'
            },
            qualification: {
              questions: [
                'What type of property are you looking for - a house, condo, or townhouse?',
                'What is your ideal timeline for moving?',
                'Do you have a budget range in mind?'
              ]
            },
            objection_handling: {
              price: 'I completely understand budget is important. These properties actually offer great value for the area, and I can show you the comparable sales data. Would it help to see them in person?',
              timing: 'No pressure at all! Even if you are just starting to look, seeing properties now gives you a better sense of what is out there. Would a quick 20-minute viewing work for you?',
              not_interested: 'I appreciate your honesty. Can I ask what changed? Maybe I can find something more aligned with what you are looking for.'
            },
            call_to_action: {
              main_cta: 'I have openings this week - would Thursday afternoon or Saturday morning work better for you?',
              alternative_cta: 'If this week is too soon, I can send you photos and schedule something for next week. What works best?'
            },
            tone: {
              style: 'friendly, professional, consultative',
              pace: 'moderate - give space for responses',
              empathy: 'high - acknowledge concerns genuinely'
            }
          },
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating baseline:', insertError.message);
      } else {
        console.log('✅ Baseline strategy (v1.0) created successfully!\n');
      }
    }

    console.log('🎉 Database setup complete!\n');
    console.log('Next steps:');
    console.log('1. Start the backend: cd backend && npm start');
    console.log('2. Configure Vapi webhook to point to: http://your-server/webhook/call-completed');
    console.log('3. Make test calls and watch the agent improve!\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n⚠️  Manual setup required:');
    console.log('1. Go to Supabase SQL Editor');
    console.log('2. Run the contents of backend/supabase-schema.sql');
    console.log('3. Run this script again\n');
  }
}

setupDatabase();
