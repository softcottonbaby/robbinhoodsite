/* ============================================
   ROBBINHOOD - API Module
   Frontend calling the secure backend proxy
   ============================================ */

const API_CONFIG = {
  url: '/api/stats',
  cooldown: 5 * 60 * 1000, // 5 minutes in ms
  refreshInterval: 60 * 1000, // 60 seconds
};

// Prize distribution for leaderboard
const PRIZES = {
  1: 750, 2: 300, 3: 180, 4: 120, 5: 80,
  6: 70,
};

let cache = {
  data: null,
  timestamp: 0,
};

async function fetchAffiliateStats() {
  const now = Date.now();

  if (cache.data && (now - cache.timestamp) < API_CONFIG.cooldown) {
    console.log('[API] Using cached data');
    return cache.data;
  }

  try {
    console.log('[API] Fetching data via secure proxy...');

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const from = firstDay.toISOString().split('T')[0];
    const to = today.toISOString().split('T')[0];

    const response = await fetch(API_CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // NO API KEY HERE! The proxy adds it.
        from: from,
        to: to,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[API] Error:', response.status, errorData);
      throw new Error(errorData.code || `HTTP ${response.status}`);
    }

    const data = await response.json();

    cache = {
      data: data,
      timestamp: now,
    };

    return data;
  } catch (err) {
    console.error('[API] Fetch failed:', err.message);
    if (cache.data) return cache.data;
    throw err;
  }
}

function processLeaderboardData(apiData) {
  if (!apiData || !apiData.summarizedBets) return [];

  const sorted = [...apiData.summarizedBets].sort((a, b) => b.wagered - a.wagered);

  return sorted.map((entry, index) => {
    const rank = index + 1;
    return {
      rank: rank,
      username: entry.user?.username || 'Anonymous',
      avatar: entry.user?.avatar || null,
      wagered: (entry.wagered || 0) / 100,
      bets: entry.bets || 0,
      xpPoints: (entry.xpPoints || 0) / 100,
      prize: PRIZES[rank] || 0,
    };
  });
}

function getLeaderboardEndDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
}

function getTimeRemaining() {
  const endDate = getLeaderboardEndDate();
  const diff = endDate - new Date();

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fetchAffiliateStats, processLeaderboardData, getTimeRemaining, getLeaderboardEndDate, PRIZES, API_CONFIG };
}