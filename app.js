// --- CONFIGURATION ---
const SERVER_DOMAIN = "ETERNAL.ozima.bond";
const FALLBACK_ADDRESS = "n6.ozima.cloud:25993";

// HTTPS Proxy to prevent mixed-content (SSL) errors on Vercel
const PLAN_API_URL = "https://corsproxy.io/?" + encodeURIComponent("http://n6.ozima.cloud:25909/v1/players");

// Custom Rank Mappings
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

  // Load live leaderboard by default if on the leaderboard page
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
  if (window.event && window.event.target) window.event.target.classList.add("active");

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

// --- LIVE LEADERBOARD LOGIC (PLAN API UUID PARSER) ---
async function loadLeaderboard(type) {
  document.querySelectorAll(".lb-btn").forEach(b => b.classList.remove("active"));
  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add("active");
  }

  const header = document.getElementById("lbValueHeader");
  if (header) header.innerText = type.charAt(0).toUpperCase() + type.slice(1);

  const tbody = document.getElementById("leaderboardBody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Syncing live server statistics...</td></tr>`;

  try {
    const response = await fetch(PLAN_API_URL);
    const data = await response.json();

    // Flatten Plan's UUID-mapped dictionary into a flat player array
    let playerList = [];
    if (Array.isArray(data)) {
      playerList = data;
    } else if (typeof data === "object" && data !== null) {
      playerList = Object.entries(data).map(([uuid, info]) => {
        if (typeof info === "object" && info !== null) {
          return { uuid, ...info };
        }
        return { uuid, name: info };
      });
    }

    // Filter out invalid/empty entries
    playerList = playerList.filter(p => p.name && p.name !== "Unknown");

    if (playerList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No player records found yet. Players must join the server to sync stats!</td></tr>`;
      return;
    }

    // Sort according to category
    if (type === "balance") {
      playerList.sort((a, b) => (Number(b.vault_balance || b.money || b.balance || 0) - Number(a.vault_balance || a.money || a.balance || 0)));
    } else if (type === "playtime") {
      playerList.sort((a, b) => (Number(b.active_playtime || b.playtime || 0) - Number(a.active_playtime || a.playtime || 0)));
    } else if (type === "kills") {
      playerList.sort((a, b) => (Number(b.player_kills || b.kills || 0) - Number(a.player_kills || a.kills || 0)));
    } else if (type === "deaths") {
      playerList.sort((a, b) => (Number(b.deaths || 0) - Number(a.deaths || 0)));
    }

    const topPlayers = playerList.slice(0, 10);

    tbody.innerHTML = topPlayers.map((player, index) => {
      const playerName = player.name;
      let displayValue = "--";

      if (type === "balance") {
        const val = Number(player.vault_balance || player.money || player.balance || 0);
        displayValue = "$" + val.toLocaleString();
      } else if (type === "playtime") {
        const ms = Number(player.active_playtime || player.playtime || 0);
        const hours = Math.floor(ms / 3600000);
        displayValue = hours > 0 ? `${hours} hrs` : `${Math.floor(ms / 60000)} mins`;
      } else if (type === "kills") {
        displayValue = `${player.player_kills || player.kills || 0} Kills`;
      } else if (type === "deaths") {
        displayValue = `${player.deaths || 0} Deaths`;
      }

      const rank = PLAYER_RANKS[playerName] || "Member";

      return `
        <tr>
          <td><strong>#${index + 1}</strong></td>
          <td>
            <div class="player-cell">
              <img src="https://mc-heads.net/avatar/${playerName}/28" alt="${playerName}">
              <span>${playerName}</span>
            </div>
          </td>
          <td><span class="player-rank-badge" data-rank="${rank}">${rank}</span></td>
          <td><strong>${displayValue}</strong></td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    // Fallback display if Plan endpoint fails
    const sampleData = {
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

    const fallbackList = sampleData[type] || [];
    tbody.innerHTML = fallbackList.map(item => `
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
