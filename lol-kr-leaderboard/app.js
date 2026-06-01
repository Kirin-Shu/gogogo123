const LANES = [
  { key: "TOP", label: "上单" },
  { key: "JUNGLE", label: "打野" },
  { key: "MIDDLE", label: "中单" },
  { key: "BOTTOM", label: "下路" },
  { key: "UTILITY", label: "辅助" },
];

const state = {
  patch: null,
  champions: null,
  keyByRiotId: null,
  stats: null,
  lane: "TOP",
  sort: { key: "winRate", dir: "desc" },
  query: "",
  loadError: null,
};

const $ = (sel, root = document) => root.querySelector(sel);

function pctClass(v) {
  if (v >= 52.5) return "pct pct--high";
  if (v <= 49.5) return "pct pct--low";
  return "pct pct--mid";
}

function fmtPct(n) {
  return `${n.toFixed(1)}%`;
}

function fmtInt(n) {
  return new Intl.NumberFormat("zh-CN").format(Math.round(n));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchJsonDirect(url, ms = 18000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** 依次尝试：直连 → corsproxy.io → allorigins（均为公网入口，仅用于绕过浏览器 CORS） */
async function fetchJsonAny(url) {
  const wrapped = [
    url,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];
  let lastErr = null;
  for (const w of wrapped) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 22000);
      const res = await fetch(w, { cache: "no-store", signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) {
        lastErr = new Error(`${res.status}`);
        continue;
      }
      const text = await res.text();
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("网络请求失败");
}

async function loadPatch() {
  const versions = await fetchJsonDirect("https://ddragon.leagueoflegends.com/api/versions.json");
  state.patch = versions[0];
  $("#patchLabel").textContent = state.patch;
}

async function loadChampions() {
  const data = await fetchJsonDirect(
    `https://ddragon.leagueoflegends.com/cdn/${state.patch}/data/ko_KR/champion.json`,
  );
  state.champions = data.data;
  const map = new Map();
  for (const ch of Object.values(data.data)) {
    map.set(String(ch.key), ch.id);
  }
  state.keyByRiotId = map;
}

function buildOpggUrlCandidates(lane, patch) {
  const common = {
    offset: "0",
    limit: "200",
    region: "kr",
    tier: "EMERALD_PLUS",
    position: lane,
    lang: "ko_KR",
  };
  const withPatch = { ...common, version: patch };
  const bases = [
    (seg) =>
      `https://lol-web-api-champion.op.gg/api/under/champion/rankings/${seg}/summoner-tier/RANKED_SOLO/champions`,
    (seg) =>
      `https://lol-api-champion.op.gg/api/under/champion/rankings/${seg}/summoner-tier/RANKED_SOLO/champions`,
  ];
  const segs = ["gw/kr/rankings/kr", "gw/KR/rankings/KR"];
  const urls = [];
  for (const base of bases) {
    for (const seg of segs) {
      urls.push(`${base(seg)}?${new URLSearchParams(withPatch)}`);
      urls.push(`${base(seg)}?${new URLSearchParams(common)}`);
    }
  }
  return [...new Set(urls)];
}

function extractArray(json) {
  const tryList = [
    json,
    json?.data,
    json?.data?.data,
    json?.data?.champions,
    json?.result,
    json?.result?.data,
    json?.champions,
    json?.rankings,
  ];
  for (const t of tryList) {
    if (Array.isArray(t)) return t;
  }
  if (json?.data && typeof json.data === "object") {
    const vals = Object.values(json.data);
    if (vals.length && typeof vals[0] === "object" && !Array.isArray(vals[0])) return vals;
  }
  return [];
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    if (obj == null) break;
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null && obj[k] !== "") {
      const v = obj[k];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function flattenRow(raw) {
  if (!raw || typeof raw !== "object") return raw;
  let o = { ...raw };
  if (raw.stats && typeof raw.stats === "object") o = { ...raw.stats, ...o };
  if (raw.statistics && typeof raw.statistics === "object") o = { ...raw.statistics, ...o };
  if (raw.champion && typeof raw.champion === "object") o = { ...raw.champion, ...o };
  if (raw.meta && typeof raw.meta === "object") o = { ...raw.meta, ...o };
  return o;
}

function normalizePercent(n) {
  if (n == null || !Number.isFinite(n)) return null;
  if (n > 0 && n <= 1) return n * 100;
  return n;
}

function computeTierScore(winRate, pickRate, banRate) {
  const w = winRate ?? 50;
  const p = pickRate ?? 5;
  const b = banRate ?? 5;
  const raw = (w - 48) * 4.2 + p * 0.85 - b * 0.22 + 52;
  return Math.max(0, Math.min(100, raw));
}

function normalizeRankingRow(raw, idMap) {
  const r = flattenRow(raw);
  let id =
    r.id && !/^\d+$/.test(String(r.id))
      ? String(r.id)
      : null;
  if (!id) id = r.key ?? r.champion_key ?? r.championKey ?? r.slug ?? r.name;
  const numId = r.champion_id ?? r.championId ?? (String(r.id).match(/^\d+$/) ? r.id : null);
  if ((!id || /^\d+$/.test(String(id))) && numId != null) {
    id = idMap.get(String(numId)) ?? id;
  }
  if (!id || typeof id !== "string") return null;

  const winRate = normalizePercent(
    pickFirst(r, ["win_rate", "winRate", "average_win_rate", "avg_win_rate", "wr", "win"]),
  );
  const pickRate = normalizePercent(
    pickFirst(r, ["pick_rate", "pickRate", "average_pick_rate", "pick"]),
  );
  const banRate = normalizePercent(
    pickFirst(r, ["ban_rate", "banRate", "average_ban_rate", "ban"]),
  );
  const games =
    pickFirst(r, ["play", "games", "game_count", "count", "plays", "match_count", "n"]) ?? 0;

  if (winRate == null) return null;
  const pick = pickRate ?? 0;
  const ban = banRate ?? 0;

  return {
    id,
    winRate,
    pickRate: pick,
    banRate: ban,
    games,
    tierScore: computeTierScore(winRate, pick, ban),
  };
}

async function fetchLaneStats(lane) {
  const urls = buildOpggUrlCandidates(lane, state.patch);
  let lastErr = null;
  for (const url of urls) {
    try {
      const json = await fetchJsonAny(url);
      const rows = extractArray(json)
        .map((raw) => normalizeRankingRow(raw, state.keyByRiotId))
        .filter(Boolean);
      if (rows.length) return rows;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error(`${lane} 无可用数据`);
}

async function loadAllStats() {
  $("#dataSource").textContent = "OP.GG · 请求中…";
  const out = {};
  await Promise.all(
    LANES.map(async ({ key }) => {
      out[key] = await fetchLaneStats(key);
    }),
  );
  state.stats = out;
  state.loadError = null;
  $("#dataSource").textContent = "OP.GG API + Data Dragon";
}

function tierLabel(score) {
  if (score >= 86) return "S";
  if (score >= 78) return "A";
  if (score >= 70) return "B";
  if (score >= 62) return "C";
  return "D";
}

function buildTabs() {
  const nav = $("#laneTabs");
  nav.innerHTML = "";
  for (const lane of LANES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab";
    btn.textContent = lane.label;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", lane.key === state.lane ? "true" : "false");
    btn.addEventListener("click", () => {
      state.lane = lane.key;
      for (const b of nav.querySelectorAll("button[role='tab']")) {
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      }
      render();
    });
    nav.appendChild(btn);
  }
}

function currentRows() {
  const rows = state.stats?.[state.lane] ?? [];
  const q = state.query.trim().toLowerCase();
  if (!q) return rows.slice();
  return rows.filter((r) => {
    const meta = state.champions?.[r.id];
    const nameKo = meta?.name?.toLowerCase() ?? "";
    const title = meta?.title?.toLowerCase() ?? "";
    const id = r.id.toLowerCase();
    return nameKo.includes(q) || title.includes(q) || id.includes(q);
  });
}

function sortedRows(rows) {
  const { key, dir } = state.sort;
  const mul = dir === "asc" ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
    return String(av).localeCompare(String(bv), "zh-CN") * mul;
  });
}

function render() {
  const tbody = $("#boardBody");
  tbody.innerHTML = "";

  if (state.loadError) {
    tbody.innerHTML = `
      <tr><td colspan="7" class="muted" style="padding:18px;">
        ${escapeHtml(state.loadError)}
        <div style="margin-top:10px"><button type="button" class="btn" id="retryBoot">重新加载</button></div>
      </td></tr>`;
    $("#rowCount").textContent = "";
    return;
  }

  const rows = sortedRows(currentRows());
  $("#rowCount").textContent = `共 ${rows.length} 条`;

  const patch = state.patch;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const meta = state.champions?.[r.id];
    const name = meta?.name ?? r.id;
    const img = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${r.id}.png`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-rank">${i + 1}</td>
      <td class="col-champ">
        <div class="champ">
          <img alt="" loading="lazy" src="${img}" />
          <div>
            <div class="champ__name">${escapeHtml(name)}</div>
            <div class="champ__key">${escapeHtml(r.id)}</div>
          </div>
        </div>
      </td>
      <td><span class="${pctClass(r.winRate)}">${fmtPct(r.winRate)}</span></td>
      <td><span class="pct">${fmtPct(r.pickRate)}</span></td>
      <td><span class="pct">${fmtPct(r.banRate)}</span></td>
      <td><span class="pct">${fmtInt(r.games)}</span></td>
      <td>
        <div class="tier">
          <span class="tier__badge">${tierLabel(r.tierScore)}</span>
          <span class="tier__score">${r.tierScore.toFixed(0)}</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  for (const btn of document.querySelectorAll(".th-btn")) {
    const k = btn.dataset.sort;
    const active = k === state.sort.key;
    btn.toggleAttribute("data-active", active);
    btn.textContent =
      {
        winRate: "胜率",
        pickRate: "选取率",
        banRate: "禁用率",
        games: "对局量",
        tierScore: "强度分",
      }[k] + (active ? (state.sort.dir === "asc" ? " ↑" : " ↓") : "");
  }
}

function wireSorting() {
  for (const btn of document.querySelectorAll(".th-btn")) {
    btn.addEventListener("click", () => {
      const key = btn.dataset.sort;
      if (state.sort.key === key) {
        state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
      } else {
        state.sort.key = key;
        state.sort.dir = "desc";
      }
      render();
    });
  }

  $("#resetSort").addEventListener("click", () => {
    state.sort = { key: "winRate", dir: "desc" };
    render();
  });
}

let domReady = false;

function initDomOnce() {
  if (domReady) return;
  domReady = true;
  wireSorting();
  buildTabs();
  $("#searchInput").addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
  });
  document.addEventListener("click", (e) => {
    if (e.target instanceof HTMLElement && e.target.id === "retryBoot") {
      void boot();
    }
  });
}

async function boot() {
  initDomOnce();
  state.loadError = null;
  $("#boardBody").innerHTML =
    '<tr><td colspan="7" class="muted" style="padding:18px;">正在从 Data Dragon 与 OP.GG 拉取数据…</td></tr>';
  $("#dataSource").textContent = "加载中…";
  await loadPatch();
  await loadChampions();
  await loadAllStats();
  render();
}

boot().catch((err) => {
  console.error(err);
  state.loadError = `加载失败：${err.message}。请确认本页通过 http:// 本地服务打开，且网络可访问 ddragon 与 op.gg（必要时使用系统代理）。`;
  state.stats = Object.fromEntries(LANES.map(({ key }) => [key, []]));
  render();
});
