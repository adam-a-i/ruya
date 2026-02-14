import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { AzureOpenAI } from '@azure/openai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Initialize Azure OpenAI client
const openai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME
});

// Vapi configuration
const VAPI_API_KEY = process.env.VAPI_API_KEY || process.env.serversideAPIVapi;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || process.env.assistant_id;

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get the current active agent version
 */
async function getCurrentAgentVersion() {
  const { data, error } = await supabase
    .from('agent_versions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching current version:', error);
    return null;
  }

  return data;
}

/**
 * Analyze a call transcript using Azure OpenAI
 */
async function analyzeCall(transcript, outcome) {
  const analysisPrompt = `You are an expert sales call analyst. Analyze this real estate sales call transcript and provide structured insights.

TRANSCRIPT:
${transcript}

OUTCOME: ${outcome}

Provide a detailed JSON analysis with the following structure:
{
  "objections": ["list of objections raised by the prospect"],
  "emotional_tone": "overall emotional state (skeptical/interested/neutral/hostile)",
  "engagement_score": "score from 1-10 of how engaged the prospect was",
  "conversion_probability": "estimated probability (0.0-1.0) that this would convert",
  "strengths": ["what the agent did well"],
  "weaknesses": ["what the agent could improve"],
  "key_moments": ["critical turning points in the conversation"],
  "improvement_suggestions": ["specific actionable improvements"]
}

Be specific and actionable. Focus on what would increase conversion rates.`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: [
        { role: 'system', content: 'You are an expert sales call analyst. Always respond with valid JSON only.' },
        { role: 'user', content: analysisPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    return analysis;
  } catch (error) {
    console.error('Error analyzing call:', error);
    throw error;
  }
}

/**
 * Generate strategy mutation based on recent performance
 */
async function generateStrategyMutation(currentStrategy, recentAnalyses, conversionRate) {
  const mutationPrompt = `You are an expert conversational AI strategist. Your goal is to improve a real estate sales agent's conversion rate.

CURRENT STRATEGY:
${JSON.stringify(currentStrategy.strategy_json, null, 2)}

CURRENT CONVERSION RATE: ${(conversionRate * 100).toFixed(1)}%
TOTAL CALLS: ${currentStrategy.total_calls}

RECENT CALL ANALYSES (Last ${recentAnalyses.length} calls):
${JSON.stringify(recentAnalyses, null, 2)}

Based on this data, generate an IMPROVED strategy that addresses the weaknesses and builds on the strengths.

RULES:
1. Make 2-3 targeted improvements (don't change everything)
2. Keep successful elements from the current strategy
3. Address the most common objections
4. Optimize for higher conversion rate
5. Keep the tone professional and conversational

Return a JSON object with:
{
  "changes_made": ["list of specific changes"],
  "reasoning": "brief explanation of why these changes will improve conversion",
  "new_strategy": { ...full strategy object with your improvements... }
}

The new_strategy should have the same structure as the current strategy but with your improvements integrated.`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: [
        { role: 'system', content: 'You are an expert conversational strategy optimizer. Always respond with valid JSON only.' },
        { role: 'user', content: mutationPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 3000
    });

    const mutation = JSON.parse(response.choices[0].message.content);
    return mutation;
  } catch (error) {
    console.error('Error generating mutation:', error);
    throw error;
  }
}

/**
 * Update Vapi assistant with new strategy
 */
async function updateVapiAssistant(strategy) {
  const systemPrompt = convertStrategyToPrompt(strategy);

  try {
    const response = await fetch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: {
          provider: 'openai',
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            }
          ]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Vapi API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating Vapi assistant:', error);
    throw error;
  }
}

/**
 * Convert strategy JSON to Vapi system prompt
 */
function convertStrategyToPrompt(strategyJson) {
  const s = strategyJson;
  
  return `You are a professional real estate sales agent. Your goal is to book property viewing appointments.

OPENING:
${s.opening.greeting}
${s.opening.intro}

QUALIFICATION QUESTIONS:
${s.qualification.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

OBJECTION HANDLING:
- Price concerns: ${s.objection_handling.price}
- Timing concerns: ${s.objection_handling.timing}
- Not interested: ${s.objection_handling.not_interested}

CALL TO ACTION:
Primary: ${s.call_to_action.main_cta}
Alternative: ${s.call_to_action.alternative_cta}

TONE GUIDELINES:
- Style: ${s.tone.style}
- Pace: ${s.tone.pace}
- Empathy: ${s.tone.empathy}

Remember: Be natural, listen actively, and focus on booking the viewing appointment. Keep responses concise (under 30 words when possible).`;
}

// ==================== API ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Ruya Self-Improving Voice Agent'
  });
});

// Webhook: Vapi call completed
app.post('/webhook/call-completed', async (req, res) => {
  try {
    console.log('📞 Call completed webhook received:', req.body);

    const { call } = req.body;
    
    // Extract call data
    const vapiCallId = call.id;
    const transcript = call.transcript || '';
    const duration = call.endedAt ? 
      Math.floor((new Date(call.endedAt) - new Date(call.startedAt)) / 1000) : 0;

    // Get current agent version
    const currentVersion = await getCurrentAgentVersion();
    
    if (!currentVersion) {
      throw new Error('No active agent version found');
    }

    // Store call in database (outcome pending - will be set later)
    const { data: callRecord, error: insertError } = await supabase
      .from('calls')
      .insert({
        vapi_call_id: vapiCallId,
        agent_version: currentVersion.version,
        transcript: transcript,
        outcome: 'pending',
        duration_seconds: duration,
        call_metadata: call
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log('✅ Call stored:', callRecord.id);

    // Trigger async analysis (don't wait for it)
    analyzeCallAsync(callRecord.id, transcript).catch(err => {
      console.error('Error in async analysis:', err);
    });

    res.json({ 
      success: true, 
      message: 'Call received and queued for analysis',
      callId: callRecord.id
    });

  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Async function to analyze call and potentially trigger mutation
async function analyzeCallAsync(callId, transcript) {
  try {
    console.log('🔍 Starting analysis for call:', callId);

    // For demo purposes, we'll default to 'not_booked'
    // In production, this would be determined from the call or set manually
    const outcome = 'not_booked'; // TODO: Extract from call or allow manual override

    // Analyze the call
    const analysis = await analyzeCall(transcript, outcome);
    
    // Update call record with analysis and outcome
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        outcome: outcome,
        analysis_json: analysis
      })
      .eq('id', callId);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Analysis complete for call:', callId);

    // Check if we should trigger a strategy mutation
    await checkAndMutateStrategy();

  } catch (error) {
    console.error('❌ Error in async analysis:', error);
  }
}

// Check if strategy should mutate based on performance
async function checkAndMutateStrategy() {
  const currentVersion = await getCurrentAgentVersion();
  
  if (!currentVersion) {
    console.log('No active version found');
    return;
  }

  // Mutation trigger: every 5 calls
  const MUTATION_THRESHOLD = 5;
  
  if (currentVersion.total_calls > 0 && currentVersion.total_calls % MUTATION_THRESHOLD === 0) {
    console.log('🔄 Mutation threshold reached! Generating new strategy...');
    
    // Get recent analyses
    const { data: recentCalls } = await supabase
      .from('calls')
      .select('analysis_json, outcome')
      .eq('agent_version', currentVersion.version)
      .not('analysis_json', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentCalls && recentCalls.length > 0) {
      const analyses = recentCalls.map(c => c.analysis_json);
      
      // Generate mutation
      const mutation = await generateStrategyMutation(
        currentVersion,
        analyses,
        currentVersion.conversion_rate
      );

      // Create new version
      const newVersionNumber = incrementVersion(currentVersion.version);
      
      const { data: newVersion, error } = await supabase
        .from('agent_versions')
        .insert({
          version: newVersionNumber,
          strategy_json: mutation.new_strategy,
          is_active: true
        })
        .select()
        .single();

      if (!error) {
        // Deactivate old version
        await supabase
          .from('agent_versions')
          .update({ is_active: false })
          .eq('version', currentVersion.version);

        // Update Vapi assistant
        await updateVapiAssistant(mutation.new_strategy);

        console.log('✨ New strategy deployed:', newVersionNumber);
        console.log('Changes made:', mutation.changes_made);
      }
    }
  }
}

// Helper to increment version number
function incrementVersion(version) {
  const match = version.match(/v(\d+)\.(\d+)/);
  if (match) {
    const major = parseInt(match[1]);
    const minor = parseInt(match[2]);
    return `v${major}.${minor + 1}`;
  }
  return 'v1.1';
}

// Get overall system stats
app.get('/api/stats/overall', async (req, res) => {
  try {
    const { data: allVersions } = await supabase
      .from('agent_versions')
      .select('*')
      .order('created_at', { ascending: false });

    const totalCalls = allVersions.reduce((sum, v) => sum + v.total_calls, 0);
    const totalBookings = allVersions.reduce((sum, v) => sum + v.total_bookings, 0);
    const overallConversionRate = totalCalls > 0 ? totalBookings / totalCalls : 0;

    res.json({
      total_calls: totalCalls,
      total_bookings: totalBookings,
      overall_conversion_rate: overallConversionRate,
      versions_created: allVersions.length,
      current_version: allVersions.find(v => v.is_active)?.version || 'none'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get per-version stats
app.get('/api/stats/versions', async (req, res) => {
  try {
    const { data: versions } = await supabase
      .from('agent_versions')
      .select('*')
      .order('created_at', { ascending: false });

    res.json({ versions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent calls
app.get('/api/calls/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const { data: calls } = await supabase
      .from('calls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    res.json({ calls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current strategy
app.get('/api/strategy/current', async (req, res) => {
  try {
    const currentVersion = await getCurrentAgentVersion();
    
    if (!currentVersion) {
      return res.status(404).json({ error: 'No active strategy found' });
    }

    res.json(currentVersion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger strategy mutation
app.post('/api/strategy/mutate', async (req, res) => {
  try {
    await checkAndMutateStrategy();
    res.json({ success: true, message: 'Strategy mutation triggered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually update call outcome
app.patch('/api/calls/:id/outcome', async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome } = req.body;

    if (!['booked', 'not_booked'].includes(outcome)) {
      return res.status(400).json({ error: 'Invalid outcome. Must be "booked" or "not_booked"' });
    }

    const { data, error } = await supabase
      .from('calls')
      .update({ outcome })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, call: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Ruya Self-Improving Voice Agent Backend');
  console.log('===========================================');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Azure OpenAI: ${process.env.AZURE_OPENAI_ENDPOINT}`);
  console.log(`✅ Supabase: ${process.env.SUPABASE_URL}`);
  console.log(`✅ Vapi Assistant: ${VAPI_ASSISTANT_ID}`);
  console.log('');
  console.log('📡 Endpoints:');
  console.log(`   POST /webhook/call-completed - Vapi webhook`);
  console.log(`   GET  /api/stats/overall - Overall stats`);
  console.log(`   GET  /api/stats/versions - Per-version stats`);
  console.log(`   GET  /api/calls/recent - Recent calls`);
  console.log(`   GET  /api/strategy/current - Current strategy`);
  console.log(`   POST /api/strategy/mutate - Trigger mutation`);
  console.log('');
});
