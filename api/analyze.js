export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobInput, skillsInput } = req.body;

    if (!jobInput) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: `You are a VA career coach. Analyze this job and create a 14-day learning plan.

JOB: ${jobInput}

SKILLS: ${skillsInput || 'Beginner'}

Provide JSON with: jobTitle, salaryRange, skillGap{hasAlready[], needToLearn[], highImpact[]}, learningPlan{week1[{day, focus, lesson, videoSearch, practice, deliverable, estimatedTime}], week2[{day, focus, lesson, steps[], deliverable}]}, portfolioPieces[{title, description}], aiAdvantage, aiUseCases[], applicationTips[]`
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

    if (data.content && data.content[0]) {
      let text = data.content[0].text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) {
        text = text.substring(start, end + 1);
      }
      const parsed = JSON.parse(text);
      return res.status(200).json(parsed);
    } else {
      throw new Error('No response from AI');
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to analyze job'
    });
  }
}
