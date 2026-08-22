// --- CONFIGURATION ---
const SERVER_DOMAIN = "ETERNAL.ozima.bond"; // Primary Subdomain
const FALLBACK_ADDRESS = "n6.ozima.cloud:25993"; // Direct Node Address

// Custom Rank Mappings (Matches username to custom rank)
const PLAYER_RANKS = {
  "REAL_TWILIGHT0_0": "Owner",
  "PRIME_VENOX": "Admin",
  "Kitsuroo": "Admin",
  "LGalewfqUwU": "Moderator",
  "D4XTROO": "Officer",
  "GMRZ_TANJID": "Member"
};

let currentOnlinePlayers = [];

document.addEventListener("DOMContentLoaded", () => {
  setupSidebar();
  fetchServerStatus();

  if (document.getElementById("leaderboardBody")) {
    loadLeaderboard('balance');
  }

  // Poll server status every 30 seconds
  setInterval(fetchServerStatus, 30000);
});

// --- SIDEBAR DRAWER NAVIGATION ---
function setupSidebar() {
  const menuBtn = document.getElementById("menuToggle");
  const closeBtn = document.getElementById("closeSidebar");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("show");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  }

  if (menuBtn) menuBtn.addEventListener("click", openSidebar);
  if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
  if (overlay) overlay.addEventListener("click", closeSidebar);

  // Modal bindings
  const playerStatCard = document.getElementById("playerStatCard");
  const closePlayerModal = document.getElementById("closePlayerModal");
  const closeEventModal = document.getElementById("closeEventModal");

  if (playerStatCard) playerStatCard.addEventListener("click", openPlayerModal);
  if (closePlayerModal) closePlayerModal.addEventListener("click", () => {
    document.getElementById("playerListModal").classList.remove("active");
  });
  if (closeEventModal) closeEventModal.addEventListener("click", () => {
    document.getElementById("eventModal").classList.remove("active");
  });
}

// --- LIVE MINECRAFT STATUS VIA API ---
async function fetchServerStatus() {
  const dot = document.getElementById("headerDot");
  const countEl = document.getElementById("onlinePlayersCount");
  const statusEl = document.getElementById("serverOnlineStatus");
  const versionEl = document.getElementById("serverVersion");

  try {
    let res = await fetch(`https://api.mcstatus.io/v2/status/java/${SERVER_DOMAIN}`);
    let data = await res.json();

    // Fallback if subdomain SRV record hasn't fully propagated
    if (!data.online) {
      res = await fetch(`https://api.mcstatus.io/v2/status/java/${FALLBACK_ADDRESS}`);
      data = await res.json();
    }

    if (data.online) {
      if (dot) dot.classList.add("online");
      if (statusEl) {
        statusEl.innerText = "Online & Running";
        statusEl.style.color = "var(--success)";
      }
      if (countEl) {
        countEl.innerText = `${data.players.online} / ${data.players.max}`;
      }
      if (versionEl && data.version) {
        versionEl.innerText = data.version.name_clean || data.version.name_raw || "1.20 - 1.21.x";
      }

      // Map player usernames to custom ranks
      if (data.players.list && data.players.list.length > 0) {
        currentOnlinePlayers = data.players.list.map(p => {
          const playerName = p.name_clean || p.name_raw || p.name || p;
          return {
            name: playerName,
            rank: PLAYER_RANKS[playerName] || "Member"
          };
        });
      } else {
        currentOnlinePlayers = [];
      }
    } else {
      if (dot) dot.classList.remove("online");
      if (statusEl) {
        statusEl.innerText = "Offline";
        statusEl.style.color = "var(--danger)";
      }
      if (countEl) countEl.innerText = "0 Players";
    }
  } catch (err) {
    if (statusEl) statusEl.innerText = "Maintenance";
    if (countEl) countEl.innerText = "--";
  }
}

// --- ACTIVE PLAYERS MODAL ---
function openPlayerModal() {
  const modal = document.getElementById("playerListModal");
  const container = document.getElementById("modalPlayerList");
  if (!modal || !container) return;

  if (currentOnlinePlayers.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);text-align:center;">No players currently online.</p>`;
  } else {
    container.innerHTML = currentOnlinePlayers.map(p => `
      <div class="player-list-entry">
        <div class="player-info-left">
          <img src="https://mc-heads.net/avatar/${p.name}/40" alt="${p.name}">
          <span>${p.name}</span>
        </div>
        <span class="player-rank-badge" data-rank="${p.rank}">${p.rank}</span>
      </div>
    `).join('');
  }

  modal.classList.add("active");
}

// --- SHOP TAB FILTER ---
function filterShop(category) {
  document.querySelectorAll(".shop-tab").forEach(tab => tab.classList.remove("active"));
  if (event && event.target) event.target.classList.add("active");

  const cards = document.querySelectorAll(".product-card");
  cards.forEach(card => {
    if (category === "all" || card.getAttribute("data-category") === category) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

function buyItem(name) {
  alert(`Redirecting to checkout for ${name}...`);
}

// --- LEADERBOARD LOGIC ---
const sampleLeaderboard = {
  balance: [
    { rank: 1, name: "REAL_TWILIGHT0_0", role: "Owner", val: "$10,450,000" },
    { rank: 2, name: "PRIME_VENOX", role: "Admin", val: "$8,230,000" },
    { rank: 3, name: "D4XTROO", role: "Officer", val: "$5,110,000" },
    { rank: 4, name: "GMRZ_TANJID", role: "Member", val: "$3,800,000" }
  ],
  playtime: [
    { rank: 1, name: "GMRZ_TANJID", role: "Member", val: "142 hrs" },
    { rank: 2, name: "REAL_TWILIGHT0_0", role: "Owner", val: "115 hrs" },
    { rank: 3, name: "PRIME_VENOX", role: "Admin", val: "98 hrs" }
  ],
  kills: [
    { rank: 1, name: "LGalewfqUwU", role: "Moderator", val: "482 Kills" },
    { rank: 2, name: "Kitsuroo", role: "Admin", val: "294 Kills" },
    { rank: 3, name: "D4XTROO", role: "Officer", val: "145 Kills" }
  ],
  deaths: [
    { rank: 1, name: "GMRZ_TANJID", role: "Member", val: "310 Deaths" },
    { rank: 2, name: "D4XTROO", role: "Officer", val: "220 Deaths" }
  ]
};

function loadLeaderboard(type) {
  document.querySelectorAll(".lb-btn").forEach(b => b.classList.remove("active"));
  if (event && event.currentTarget) event.currentTarget.classList.add("active");

  const header = document.getElementById("lbValueHeader");
  if (header) header.innerText = type.charAt(0).toUpperCase() + type.slice(1);

  const tbody = document.getElementById("leaderboardBody");
  if (!tbody) return;

  const data = sampleLeaderboard[type] || [];
  tbody.innerHTML = data.map(item => `
    <tr>
      <td><strong>#${item.rank}</strong></td>
      <td>
        <div class="player-cell">
          <img src="https://mc-heads.net/avatar/${item.name}/28" alt="${item.name}">
          <span>${item.name}</span>
        </div>
      </td>
      <td><span class="player-rank-badge" data-rank="${item.role}">${item.role}</span></td>
      <td><strong>${item.val}</strong></td>
    </tr>
  `).join('');
}

// --- EVENT MODAL ---
function openEventHistory(title, winner, reward, description) {
  const modal = document.getElementById("eventModal");
  if (!modal) return;
  document.getElementById("eventModalTitle").innerText = title;
  document.getElementById("eventModalBody").innerHTML = `
    <p><strong><i class="fa-solid fa-trophy" style="color:#f1c40f;"></i> Champion:</strong> ${winner}</p>
    <p><strong><i class="fa-solid fa-gift" style="color:var(--accent);"></i> Reward:</strong> ${reward}</p>
    <hr style="border:0;border-top:1px solid var(--border);margin:12px 0;">
    <p style="color:var(--text-muted);font-size:0.9rem;">${description}</p>
  `;
  modal.classList.add("active");
}

// --- CLIPBOARD COPY ---
function copyIP(ip) {
  navigator.clipboard.writeText(ip).then(() => {
    const toast = document.getElementById("toast");
    toast.innerText = `Copied ${ip} to clipboard!`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
  });
}
