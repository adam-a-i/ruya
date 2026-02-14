// Test script to simulate a Vapi webhook call
// Usage: node scripts/test-webhook.js

const testCallData = {
  call: {
    id: 'test-call-' + Date.now(),
    startedAt: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
    endedAt: new Date().toISOString(),
    transcript: `Agent: Hi! This is Sarah calling from Premier Realty. How are you doing today?

Customer: I'm okay, a bit busy actually.

Agent: I understand! I'll keep this brief. I saw you expressed interest in viewing properties in the area. I have some amazing listings that just came on the market that I think you would love.

Customer: Yeah, I did look at some listings online. But honestly, the prices seem really high right now.

Agent: I completely understand budget is important. These properties actually offer great value for the area, and I can show you the comparable sales data. Would it help to see them in person?

Customer: I don't know... I'm not sure if now is the right time. Maybe in a few months.

Agent: No pressure at all! Even if you are just starting to look, seeing properties now gives you a better sense of what is out there. Would a quick 20-minute viewing work for you?

Customer: I appreciate it, but I think I need to wait. My lease isn't up until August anyway.

Agent: I appreciate your honesty. Can I ask what changed? Maybe I can find something more aligned with what you are looking for.

Customer: Nothing changed really, I'm just not ready yet. Thanks though.

Agent: No problem at all! Can I follow up with you in a couple months when you're closer to your move date?

Customer: Sure, that would be fine.

Agent: Perfect! I'll reach out in June. Have a great day!

Customer: You too, bye.`,
    customer: {
      number: '+15555551234'
    },
    assistantId: process.env.VAPI_ASSISTANT_ID || process.env.assistant_id,
    type: 'webCall',
    status: 'ended'
  }
};

async function testWebhook() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const webhookUrl = `${baseUrl}/webhook/call-completed`;

  console.log('🧪 Testing Vapi Webhook...\n');
  console.log('📍 Webhook URL:', webhookUrl);
  console.log('📞 Simulating call completion...\n');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCallData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Webhook test successful!\n');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('\n💡 Check your backend logs to see the analysis process');
      console.log('💡 Run: curl http://localhost:3000/api/calls/recent');
    } else {
      console.log('❌ Webhook test failed\n');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
    console.log('\n💡 Make sure the backend server is running:');
    console.log('   cd backend && npm start');
  }
}

testWebhook();
