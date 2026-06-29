const SUPABASE_URL = "https://ttpgozkctrjkphrfmkxh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0cGdvemtjdHJqa3BocmZta3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2OTM3OTUsImV4cCI6MjA4NjI2OTc5NX0.DNFlp5vjJgPfJfmecscLOAQWJBuUjuVY4TaDxWeWMo0";
const headers = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`
};
async function loadHistory() {
  const lobbyId = document.getElementById("lobbyId").value;
  if (!lobbyId) return;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/flips?lobby_id=eq.${lobbyId}&order=created_at.asc`,
    { headers }
  );

  const data = await res.json();
  renderHistory(data);
}
let flipping = false;
async function flip() {
  if (flipping) return;
  flipping = true;
  const lobbyId = document.getElementById("lobbyId").value;
  const coin = document.getElementById("coin");
  const resultText = document.getElementById("flipResult");

  if (!lobbyId || !coin) {
    flipping = false;
    return;
  }

  let password =
    sessionStorage.getItem(`pw_${lobbyId}`) ||
    document.getElementById("password").value;

  coin.classList.remove("heads", "tails");
  coin.classList.add("spinning");
  resultText.textContent = "Flipping…";

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/flip_coin`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        lobby_id: lobbyId,
        plain_password: password
      })
    }
  );

  if (!res.ok) {
    alert(await res.text());
    coin.classList.remove("spinning");
    resultText.textContent = "—";
    flipping = false;
    return;
  }

  const [{ result }] = await res.json(); // 🔑 THE FIX

  sessionStorage.setItem(`pw_${lobbyId}`, password);
  document.getElementById("passwordBlock").style.display = "none";

  const side = result === "HEADS" ? "heads" : "tails";

  setTimeout(() => {
    coin.classList.remove("spinning");
    coin.classList.add(side);
    coin.textContent = side === "heads" ? "H" : "T";
    resultText.textContent = side.toUpperCase();
  }, 300);

  await loadHistory();
  flipping = false;
}

/* =========================
   Render History
========================= */
function renderHistory(flips) {
  const tbody = document.getElementById("history");
  tbody.innerHTML = "";

  flips.forEach((f, i) => {
    const tr = document.createElement("tr");

    const time = new Date(f.created_at);
    const formattedTime = time.toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "short"
    });

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${formattedTime}</td>
      <td>${f.result}</td>
    `;

    tbody.appendChild(tr);
  });
}
async function createLobby() {
  const lobbyId = document.getElementById("newLobbyId").value.trim();
  const password = document.getElementById("newPassword").value;
  const days = parseInt(document.getElementById("expiryDays").value, 10);
  const status = document.getElementById("createStatus");

  status.textContent = "";

  if (!lobbyId || !password || !days) {
    status.textContent = "Missing fields";
    return;
  }

  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/create_lobby`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        lobby_id: lobbyId,
        plain_password: password,
        expires_at: expiresAt
      })
    }
  );

  status.textContent = res.ok
    ? `Lobby "${lobbyId}" created`
    : await res.text();
}
/* =========================
   Auto-load Lobby from URL
========================= */
(function autoLoadLobbyFromURL() {
  const params = new URLSearchParams(window.location.search);
  const lobbyFromURL = params.get("lobby");
  if (!lobbyFromURL) return;

  document.getElementById("lobbyId").value = lobbyFromURL;
  loadHistory();

  if (sessionStorage.getItem(`pw_${lobbyFromURL}`)) {
    document.getElementById("passwordBlock").style.display = "none";
  }
})();

/* =========================
   Copy Lobby Link
========================= */
function copyLobbyLink() {
  const lobbyId = document.getElementById("lobbyId").value;
  if (!lobbyId) return alert("No lobby ID");

  const url =
    `${window.location.origin}${window.location.pathname}?lobby=${encodeURIComponent(lobbyId)}`;

  navigator.clipboard.writeText(url);
  alert("Lobby link copied!");
}

/* =========================
   Coin Click
========================= */
document.getElementById("coin").addEventListener("click", flip);
