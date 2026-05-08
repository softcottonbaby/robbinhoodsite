const HYPEBET_API_URL = 'https://api.hype.bet/wallet/api/v1/affiliate/creator/get-stats';

let cachedData = null;
let lastFetchTime = 0;
const COOLDOWN_MS = 5 * 60 * 1000;


// Cycle 1: May 1 - May 17, 2026 (ACTIVE)
const CURRENT_CYCLE = {
  from: '2026-05-01',
  to: '2026-05-17'
};

// NEXT CYCLE: 
// const CURRENT_CYCLE = {
//   from: '2026-05-18',
//   to: '2026-05-31'
// };
// 

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = Date.now();

    if (cachedData && (now - lastFetchTime) < COOLDOWN_MS) {
      console.log('[Serverless] Serving from cache');
      return res.json(cachedData);
    }

    if (!process.env.HYPEBET_API_KEY) {
      return res.status(500).json({ error: 'Missing API Key' });
    }

    console.log('[Serverless] Fetching cycle:', CURRENT_CYCLE.from, 'to', CURRENT_CYCLE.to);

    const response = await fetch(HYPEBET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({
        apiKey: process.env.HYPEBET_API_KEY,
        from: CURRENT_CYCLE.from,
        to: CURRENT_CYCLE.to,
      }),
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error(`[Serverless] Hypebet Error (${response.status}):`, rawText);
      if ((response.status === 401 || response.status === 429) && cachedData) {
        return res.json(cachedData);
      }
      try { return res.status(response.status).json(JSON.parse(rawText)); }
      catch (e) { return res.status(response.status).send(rawText); }
    }

    const data = JSON.parse(rawText);
    cachedData = data;
    lastFetchTime = Date.now();

    console.log('[Serverless] Successfully fetched and cached new data!');
    return res.json(data);

  } catch (err) {
    console.error('[Serverless] Critical Error:', err.message);
    if (cachedData) return res.json(cachedData);
    return res.status(500).json({ error: 'Internal server error' });
  }
}