function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('on'));

  if (viewId === 'home') {
    document.getElementById('home-view').classList.add('active');
    document.getElementById('nav-home').classList.add('on');
  } else if (viewId === 'leaderboard') {
    document.getElementById('leaderboard-view').classList.add('active');
    document.getElementById('nav-lb').classList.add('on');
    loadLeaderboard();
  } else if (viewId === 'milestones') {
    document.getElementById('milestones-view').classList.add('active');
    document.getElementById('nav-milestones').classList.add('on');
  }

  window.scrollTo(0, 0);
}

function showMilestoneNotice() {
  const modal = document.getElementById('milestone-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
}

function closeMilestoneNotice() {
  const modal = document.getElementById('milestone-modal');
  if (!modal) return;
  modal.classList.add('hidden');
}

let currentLeaderboard = 'hypebet';

function switchLeaderboard(site) {
  if (site === currentLeaderboard) return;

  document.querySelectorAll('.lb-site-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.site === site) {
      btn.classList.add('active');
    }
  });

  currentLeaderboard = site;

  const heroTitle = document.querySelector('#leaderboard-view .hero h1');
  if (heroTitle) {
    if (site === 'hypebet') {
      heroTitle.innerHTML = '<span class="white">$2,000 </span><span class="green-grad">Bi-Weekly Leaderboard</span>';
    }
  }

  loadLeaderboard();

  const tbody = document.getElementById('tbody');
  const podium = document.getElementById('podium');
  if (tbody) tbody.style.opacity = '0.5';
  if (podium) podium.style.opacity = '0.5';
  setTimeout(() => {
    if (tbody) tbody.style.opacity = '1';
    if (podium) podium.style.opacity = '1';
  }, 300);
}

(function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 18; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.8,
      dx: (Math.random() - 0.5) * 0.2,
      dy: -Math.random() * 0.3 - 0.12,
      opacity: Math.random() * 0.18 + 0.08,
      pulse: Math.random() * Math.PI * 2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.pulse += 0.02;
      const glow = 0.55 + Math.sin(p.pulse) * 0.35;

      ctx.save();
      ctx.beginPath();
      ctx.shadowColor = `rgba(103,213,35,${p.opacity * glow * 0.22})`;
      ctx.shadowBlur = p.r * 10;
      ctx.fillStyle = `rgba(103,213,35,${p.opacity * glow * 0.14})`;
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(134,239,172,${p.opacity * glow})`;
      ctx.fill();

      p.x += p.dx; p.y += p.dy;
      if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

let countdownInterval = null;

function startCountdown() {
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  const time = getTimeRemaining();

  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-mins');
  const secsEl = document.getElementById('cd-secs');

  if (daysEl) daysEl.textContent = String(time.days).padStart(2, '0');
  if (hoursEl) hoursEl.textContent = String(time.hours).padStart(2, '0');
  if (minsEl) minsEl.textContent = String(time.minutes).padStart(2, '0');
  if (secsEl) secsEl.textContent = String(time.seconds).padStart(2, '0');
}

let leaderboardData = [];
let autoRefreshInterval = null;

async function loadLeaderboard() {
  const tbody = document.getElementById('tbody');
  const podium = document.getElementById('podium');

  if (tbody) tbody.innerHTML = '<div class="tr-empty"><div class="spinner"></div></div>';

  try {
    const apiData = await fetchAffiliateStats();
    leaderboardData = processLeaderboardData(apiData);

    renderPodium(leaderboardData.slice(0, 3));
    renderTable(leaderboardData.slice(3, 10));

    if (!countdownInterval) startCountdown();

    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(async () => {
      try {
        if (document.hidden) return;
        const freshData = await fetchAffiliateStats();
        const newLeaderboard = processLeaderboardData(freshData);
        const changed = newLeaderboard.length !== leaderboardData.length || newLeaderboard.some((player, idx) => {
          const existing = leaderboardData[idx];
          return !existing || existing.rank !== player.rank || existing.wagered !== player.wagered || existing.prize !== player.prize;
        });
        if (changed) {
          leaderboardData = newLeaderboard;
          renderPodium(leaderboardData.slice(0, 3));
          renderTable(leaderboardData.slice(3, 10));
        }
      } catch (e) {
        console.log('[App] Auto-refresh failed, keeping current data');
      }
    }, API_CONFIG.refreshInterval);

  } catch (err) {
    console.error('[App] Failed to load leaderboard:', err);
    if (tbody) {
      tbody.innerHTML = `
        <div class="tr-empty">
          <p>Unable to load leaderboard data.</p>
          <p style="font-size: 12px; margin-top: 8px;">${escapeHtml(err.message)}</p>
        </div>
      `;
    }
    renderPodium([]);
  }
}

function renderPodium(top3) {
  const podium = document.getElementById('podium');
  if (!podium) return;

  const positions = [
    { pos: 2, cls: 'p2', nameCls: 'silver' },
    { pos: 1, cls: 'p1', nameCls: 'gold' },
    { pos: 3, cls: 'p3', nameCls: 'bronze' },
  ];

  podium.innerHTML = positions.map(({ pos, cls, nameCls }) => {
    const player = top3.find(p => p.rank === pos);

    if (!player) {
      return `
        <div class="pod-card ${cls}">
          <div class="rn">${pos}</div>
          <div class="empty-avatar">?</div>
          <div class="pod-name">TBD</div>
          <div class="stats-box">
            <div class="stat-block">
              <div class="stat-label">Wagered</div>
              <div class="stat-value">$0.00</div>
            </div>
            <div class="stat-block">
              <div class="stat-label">Prize</div>
              <div class="stat-value prize">$0</div>
            </div>
          </div>
        </div>
      `;
    }

    const avatarHtml = player.avatar
      ? `<img src="${escapeHtml(player.avatar)}" alt="${escapeHtml(player.username)}" class="pod-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="empty-avatar" style="display:none">?</div>`
      : `<div class="empty-avatar">${player.username.charAt(0).toUpperCase()}</div>`;

    return `
      <div class="pod-card ${cls}">
        <div class="rn">${pos}</div>
        ${avatarHtml}
        <div class="pod-name ${nameCls}">${escapeHtml(player.username)}</div>
        <div class="stats-box">
          <div class="stat-block">
            <div class="stat-label">Wagered</div>
            <div class="stat-value">$${player.wagered.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div class="stat-block">
            <div class="stat-label">Prize</div>
            <div class="stat-value prize">$${player.prize.toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTable(players) {
  const tbody = document.getElementById('tbody');
  if (!tbody) return;

  if (players.length === 0) {
    tbody.innerHTML = '<div class="tr-empty">No additional entries yet. Be the first to wager!</div>';
    return;
  }

  tbody.innerHTML = players.map(player => {
    const avatarHtml = player.avatar
      ? `<img src="${escapeHtml(player.avatar)}" alt="" class="player-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="player-avatar" style="display:none;background:var(--bg3);align-items:center;justify-content:center;color:var(--t3);font-size:12px;font-weight:700;">${player.username.charAt(0).toUpperCase()}</div>`
      : `<div class="player-avatar" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;color:var(--t3);font-size:12px;font-weight:700;">${player.username.charAt(0).toUpperCase()}</div>`;

    return `
      <div class="tbl-row">
        <div class="rank-num">${player.rank}</div>
        <div class="player-info">
          ${avatarHtml}
          <span class="player-name">${escapeHtml(player.username)}</span>
        </div>
        <div class="wager-amt">$${player.wagered.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="prize-amt">$${player.prize.toLocaleString()}</div>
      </div>
    `;
  }).join('');
}

async function loadMilestones() {
  try {
    const apiData = await fetchAffiliateStats();
    const players = processLeaderboardData(apiData);

    const totalWagered = players.reduce((sum, p) => sum + p.wagered, 0);
    const totalBets = players.reduce((sum, p) => sum + p.bets, 0);
    const activePlayers = players.length;
    const topWagerer = players.length > 0 ? players[0].wagered : 0;

    updateMilestone('wagered', totalWagered, 100000);
    updateMilestone('players', activePlayers, 500);
    updateMilestone('bets', totalBets, 50000);
    updateMilestone('top', topWagerer, 25000);

  } catch (err) {
    console.error('[App] Failed to load milestones:', err);
    ['wagered', 'players', 'bets', 'top'].forEach(key => {
      const currentEl = document.getElementById(`ms-${key}-current`);
      if (currentEl) currentEl.textContent = key === 'players' || key === 'bets' ? '0' : '$0';
    });
  }
}

function updateMilestone(key, current, target) {
  const currentEl = document.getElementById(`ms-${key}-current`);
  const targetEl = document.getElementById(`ms-${key}-target`);
  const progressBar = document.querySelector(`#ms-${key}-current`).closest('.milestone-card').querySelector('.milestone-progress-bar');

  if (currentEl) {
    if (key === 'players' || key === 'bets') {
      currentEl.textContent = current.toLocaleString();
    } else {
      currentEl.textContent = '$' + current.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
  }

  if (targetEl) {
    if (key === 'players' || key === 'bets') {
      targetEl.textContent = target.toLocaleString();
    } else {
      targetEl.textContent = '$' + target.toLocaleString();
    }
  }

  if (progressBar) {
    const pct = Math.min((current / target) * 100, 100);
    progressBar.style.width = pct + '%';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  switchView('home');
});

window.addEventListener('popstate', () => {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'leaderboard') {
    switchView('leaderboard');
  } else if (hash === 'milestones') {
    switchView('milestones');
  } else {
    switchView('home');
  }
});