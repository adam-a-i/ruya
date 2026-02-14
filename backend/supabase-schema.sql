-- Self-Improving Voice Agent Database Schema
-- Run this in your Supabase SQL Editor

-- Table: agent_versions
-- Stores different versions of the agent's conversational strategy
CREATE TABLE IF NOT EXISTS agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  strategy_json JSONB NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  conversion_rate FLOAT DEFAULT 0.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: calls
-- Stores each call with transcript, outcome, and analysis
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vapi_call_id TEXT UNIQUE,
  agent_version TEXT REFERENCES agent_versions(version),
  transcript TEXT,
  outcome TEXT CHECK (outcome IN ('booked', 'not_booked', 'pending')),
  duration_seconds INTEGER,
  analysis_json JSONB,
  customer_phone TEXT,
  call_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_calls_agent_version ON calls(agent_version);
CREATE INDEX IF NOT EXISTS idx_calls_outcome ON calls(outcome);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_versions_active ON agent_versions(is_active);

-- Function to update agent_versions stats after each call
CREATE OR REPLACE FUNCTION update_agent_version_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if outcome is set
  IF NEW.outcome IS NOT NULL AND NEW.outcome != 'pending' THEN
    UPDATE agent_versions
    SET 
      total_calls = (
        SELECT COUNT(*) 
        FROM calls 
        WHERE agent_version = NEW.agent_version 
        AND outcome != 'pending'
      ),
      total_bookings = (
        SELECT COUNT(*) 
        FROM calls 
        WHERE agent_version = NEW.agent_version 
        AND outcome = 'booked'
      ),
      conversion_rate = (
        SELECT 
          CASE 
            WHEN COUNT(*) > 0 
            THEN CAST(SUM(CASE WHEN outcome = 'booked' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)
            ELSE 0
          END
        FROM calls 
        WHERE agent_version = NEW.agent_version 
        AND outcome != 'pending'
      ),
      updated_at = NOW()
    WHERE version = NEW.agent_version;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stats
DROP TRIGGER IF EXISTS trigger_update_agent_stats ON calls;
CREATE TRIGGER trigger_update_agent_stats
  AFTER INSERT OR UPDATE OF outcome ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_version_stats();

-- Insert baseline v1.0 strategy
INSERT INTO agent_versions (version, strategy_json, is_active) 
VALUES (
  'v1.0',
  '{
    "version": "v1.0",
    "description": "Baseline real estate agent - conversational and professional",
    "opening": {
      "greeting": "Hi! This is Sarah calling from Premier Realty. How are you doing today?",
      "intro": "I saw you expressed interest in viewing properties in the area. I have some amazing listings that just came on the market that I think you would love."
    },
    "qualification": {
      "questions": [
        "What type of property are you looking for - a house, condo, or townhouse?",
        "What is your ideal timeline for moving?",
        "Do you have a budget range in mind?"
      ]
    },
    "objection_handling": {
      "price": "I completely understand budget is important. These properties actually offer great value for the area, and I can show you the comparable sales data. Would it help to see them in person?",
      "timing": "No pressure at all! Even if you are just starting to look, seeing properties now gives you a better sense of what is out there. Would a quick 20-minute viewing work for you?",
      "not_interested": "I appreciate your honesty. Can I ask what changed? Maybe I can find something more aligned with what you are looking for."
    },
    "call_to_action": {
      "main_cta": "I have openings this week - would Thursday afternoon or Saturday morning work better for you?",
      "alternative_cta": "If this week is too soon, I can send you photos and schedule something for next week. What works best?"
    },
    "tone": {
      "style": "friendly, professional, consultative",
      "pace": "moderate - give space for responses",
      "empathy": "high - acknowledge concerns genuinely"
    }
  }'::jsonb,
  true
)
ON CONFLICT (version) DO NOTHING;

-- Table: call_learnings
-- Stores what worked/failed from each call analysis
CREATE TABLE IF NOT EXISTS call_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id),
  outcome TEXT CHECK (outcome IN ('booked', 'not_booked')),
  what_worked TEXT,
  what_failed TEXT,
  key_phrase TEXT,
  objection_types TEXT[], -- Array of objection types encountered
  engagement_level TEXT, -- 'high', 'medium', 'low'
  conversion_factors JSONB, -- Detailed factors that led to outcome
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: learning_patterns
-- Aggregated patterns learned from multiple calls
CREATE TABLE IF NOT EXISTS learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL, -- 'success_pattern', 'failure_pattern', 'trend'
  pattern_description TEXT NOT NULL,
  pattern_data JSONB, -- Detailed pattern information
  frequency INTEGER DEFAULT 1, -- How many times this pattern appeared
  success_rate FLOAT, -- Conversion rate when this pattern is present
  confidence_score FLOAT DEFAULT 0.0, -- How confident we are in this pattern
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: prompt_evolution
-- Track how prompts evolve and their performance
CREATE TABLE IF NOT EXISTS prompt_evolution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  prompt_snapshot TEXT NOT NULL, -- Full prompt at this point
  changes_made TEXT[], -- What changed from previous version
  calls_count INTEGER DEFAULT 0,
  conversion_rate FLOAT DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_call_learnings_call_id ON call_learnings(call_id);
CREATE INDEX IF NOT EXISTS idx_call_learnings_outcome ON call_learnings(outcome);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_type ON learning_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_active ON learning_patterns(is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_evolution_version ON prompt_evolution(version);

-- Create a view for easy dashboard queries
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
  av.version,
  av.total_calls,
  av.total_bookings,
  av.conversion_rate,
  av.is_active,
  av.created_at,
  COUNT(c.id) FILTER (WHERE c.created_at > NOW() - INTERVAL '24 hours') as calls_last_24h,
  COUNT(c.id) FILTER (WHERE c.created_at > NOW() - INTERVAL '24 hours' AND c.outcome = 'booked') as bookings_last_24h
FROM agent_versions av
LEFT JOIN calls c ON c.agent_version = av.version
GROUP BY av.id, av.version, av.total_calls, av.total_bookings, av.conversion_rate, av.is_active, av.created_at
ORDER BY av.created_at DESC;
