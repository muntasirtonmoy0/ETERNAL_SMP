// --- CONFIGURATION ---
const SERVER_DOMAIN = "play-eternal-smp.duckdns.org:5479";
const FALLBACK_ADDRESS = "160.25.5.205:5479";

// Custom Rank Mappings
const PLAYER_RANKS = {
  "REAL_TWILIGHT0_0": "Owner",
  "PRIME_VENOX": "Admin",
  "Kitsuroo": "Admin",
  "LGalewfqUwU": "Moderator",
  "HopeUltimate": "Moderator",
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

  setInterval(fetchServerStatus, 30000);
});

// --- CLIPBOARD COPY & TOAST NOTIFICATION ---
function copyIP(customText) {
  const textToCopy = customText || SERVER_DOMAIN;
  navigator.clipboard.writeText(textToCopy).then(() => {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.innerText = `Copied ${textToCopy} to clipboard!`;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2500);
    }
  }).catch(() => {
    // Fallback if clipboard API is blocked
    const tempInput = document.createElement("input");
    tempInput.value = textToCopy;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    
    const toast = document.getElementById("toast");
    if (toast) {
      toast.innerText = `Copied ${textToCopy} to clipboard!`;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2500);
    }
  });
}

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

// --- LIVE LEADERBOARD LOGIC ---
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
    const response = await fetch(`/api/leaderboard?type=${type}&_=${Date.now()}`);
    const players = await response.json();

    if (!Array.isArray(players) || players.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = players.map((player, index) => {
      let displayValue = "--";
      const num = Number(player.value) || 0;

      if (type === "balance") {
        if (num >= 1e9) {
          displayValue = "$" + (num / 1e9).toFixed(2) + "B";
        } else if (num >= 1e6) {
          displayValue = "$" + (num / 1e6).toFixed(2) + "M";
        } else if (num >= 1e3) {
          displayValue = "$" + (num / 1e3).toFixed(2) + "K";
        } else {
          displayValue = "$" + num.toLocaleString();
        }
      } else if (type === "playtime") {
        const hours = Math.floor(num / 3600);
        const mins = Math.floor((num % 3600) / 60);
        const secs = num % 60;
        if (hours > 0) {
          displayValue = `${hours}h ${mins}m`;
        } else if (mins > 0) {
          displayValue = `${mins}m ${secs}s`;
        } else {
          displayValue = `${secs}s`;
        }
      } else if (type === "kills") {
        displayValue = `${num} Kills`;
      } else if (type === "deaths") {
        displayValue = `${num} Deaths`;
      }

      const rank = PLAYER_RANKS[player.name] || "Member";

      return `
        <tr>
          <td><strong>#${index + 1}</strong></td>
          <td>
            <div class="player-cell">
              <img src="https://mc-heads.net/avatar/${player.name}/28" alt="${player.name}">
              <span>${player.name}</span>
            </div>
          </td>
          <td><span class="player-rank-badge" data-rank="${rank}">${rank}</span></td>
          <td><strong>${displayValue}</strong></td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--danger);">Error syncing live leaderboard.</td></tr>`;
  }
}
