#!/usr/bin/env python3
"""Build aespa site: split assets, webp, og-share."""
from __future__ import annotations

import re
import shutil
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None  # type: ignore

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "index.html"
IMAGES = ROOT / "images"

# Member / hero images used on the page
WEBP_IMAGES = [
    "karina.jpg",
    "karina-2.jpg",
    "karina-3.jpg",
    "giselle.jpg",
    "giselle-2.jpg",
    "giselle-3.jpg",
    "giselle-4.jpg",
    "winter.jpg",
    "winter-2.jpg",
    "winter-3.jpg",
    "ningning.jpg",
    "ningning-2.jpg",
    "ningning-3.jpg",
    "lemonade-cover.jpg",
]


def extract_css(html: str) -> str:
    m = re.search(r"<style>(.*?)</style>", html, re.DOTALL)
    if not m:
        raise SystemExit("No <style> block found")
    return m.group(1).strip() + "\n"


def extract_scripts(html: str) -> str:
    parts = re.findall(r"<script>\s*(.*?)\s*</script>", html, re.DOTALL)
    return "\n\n".join(p.strip() for p in parts) + "\n"


def extra_css() -> str:
    return """
      .mv-lyric-link {
        font-family: inherit;
        font-size: 0.75rem;
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid rgba(236, 72, 153, 0.4);
        background: rgba(236, 72, 153, 0.12);
        color: #fbcfe8;
        cursor: pointer;
        transition: 0.2s;
        margin-left: auto;
      }
      .mv-lyric-link:hover {
        background: rgba(236, 72, 153, 0.22);
      }
      .mv-lyric-link.hidden {
        display: none;
      }
      .mv-player-head {
        flex-wrap: wrap;
      }
      .disc-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 14px;
      }
      .disc-filter {
        font-family: inherit;
        font-size: 0.78rem;
        padding: 7px 14px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: var(--card);
        color: var(--muted);
        cursor: pointer;
        transition: 0.2s;
      }
      .disc-filter:hover {
        color: var(--text);
        border-color: rgba(168, 85, 247, 0.35);
      }
      .disc-filter.active {
        color: #e9d5ff;
        border-color: rgba(168, 85, 247, 0.5);
        background: rgba(168, 85, 247, 0.18);
      }
      .disc-row.is-hidden {
        display: none;
      }
      .ae-chip {
        cursor: pointer;
        transition: transform 0.2s, border-color 0.2s, background 0.2s;
      }
      .ae-chip:hover,
      .ae-chip:focus-visible {
        transform: translateY(-2px);
        border-color: rgba(168, 85, 247, 0.45);
        background: rgba(168, 85, 247, 0.14);
        outline: none;
      }
      .awards-by-year {
        display: grid;
        gap: 18px;
      }
      .award-year-group h4 {
        margin: 0 0 10px;
        font-size: 0.82rem;
        color: #c4b5fd;
        letter-spacing: 0.08em;
      }
      .member-gallery.is-autoplay-paused .member-gallery-hint::after {
        content: " · 已暂停";
        opacity: 0.75;
      }
      picture.member-photo-wrap,
      picture.member-photo-wrap img {
        flex: 0 0 100%;
        width: 100%;
        height: 100%;
        display: block;
      }
      picture.member-photo-wrap {
        scroll-snap-align: start;
        scroll-snap-stop: always;
      }
"""


def patch_html(html: str) -> str:
    html = html.replace(
        '<meta property="og:image" content="https://Kirin-Shu.github.io/gogogo123/aespa/images/karina.jpg" />',
        '<meta property="og:image" content="https://Kirin-Shu.github.io/gogogo123/aespa/images/og-share.jpg" />',
    )
    html = html.replace(
        '<meta name="twitter:image" content="https://Kirin-Shu.github.io/gogogo123/aespa/images/karina.jpg" />',
        '<meta name="twitter:image" content="https://Kirin-Shu.github.io/gogogo123/aespa/images/og-share.jpg" />',
    )
    html = html.replace(
        '<link rel="apple-touch-icon" href="images/karina.jpg" />',
        '<link rel="apple-touch-icon" href="images/lemonade-cover.jpg" />\n'
        '    <link rel="manifest" href="manifest.json" />\n'
        '    <link rel="stylesheet" href="style.css" />',
    )

    # Remove inline style block
    html = re.sub(r"\s*<style>.*?</style>", "", html, count=1, flags=re.DOTALL)

    # MV lyric link in player head
    html = html.replace(
        '<div class="mv-platform" id="mvPlatform">',
        '<button type="button" class="mv-lyric-link hidden" id="mvLyricLink">📖 看歌词解读</button>\n'
        '            <div class="mv-platform" id="mvPlatform">',
    )

    # New MV tabs (after rich-man)
    new_tabs = """
          <button type="button" class="mv-tab" data-song="dirty-work" data-id="M2WTUoy4y6E" data-bvid="BV1KRKfzGEV5" data-aid="114749849213939" data-cid="30718692357" data-title="Dirty Work" data-meta="2025 · 单曲">Dirty Work</button>
          <button type="button" class="mv-tab" data-song="spicy" data-id="Os_heh8vPfs" data-bvid="BV1qz4y1a7m8" data-aid="570920682" data-cid="1122540610" data-title="Spicy" data-meta="2023 · MY WORLD">Spicy</button>
          <button type="button" class="mv-tab" data-song="girls" data-id="DMbTu3BQ34E" data-bvid="BV1Ng411n79c" data-aid="518650086" data-cid="921709579" data-title="Girls" data-meta="2022 · 迷你二辑">Girls</button>
          <button type="button" class="mv-tab" data-song="hot-mess" data-id="2iK3ccCsI6s" data-bvid="BV1af421q7Fe" data-aid="1206243478" data-cid="1603624784" data-title="Hot Mess" data-meta="2024 · 日本出道">Hot Mess</button>"""
    html = html.replace(
        'data-meta="2025 · 迷你六辑主打">Rich Man</button>',
        'data-meta="2025 · 迷你六辑主打">Rich Man</button>' + new_tabs,
    )

    # New lyric cards before closing lyrics-grid
    new_lyrics = """
          <article class="lyric-card" id="lyric-dirty-work" data-song="dirty-work">
            <h3>Dirty Work</h3>
            <p class="album-ref">单曲 · 2025</p>
            <p class="lyric-ko">「Cool and chill · 以工业感 Beat 宣告态度」</p>
            <p class="lyric-zh">
              2025 年夏季单曲，MV 在钢铁厂取景，以重型机械与 Hip-Hop 节奏呈现「Dirty Work」的硬朗自信——不必讨好，只做自己的主角。
            </p>
            <p class="lyric-note">2025.06 · 迷你回归单曲 · 工业风视觉</p>
            <div class="lyric-actions">
              <button type="button" class="lyric-mv-link" data-song="dirty-work">▶ 播放 MV</button>
            </div>
          </article>
          <article class="lyric-card" id="lyric-spicy" data-song="spicy">
            <h3>Spicy</h3>
            <p class="album-ref">迷你三辑《MY WORLD》· 2023</p>
            <p class="lyric-ko">「I'm too spicy for your sauce · 太辣你承受不住」</p>
            <p class="lyric-zh">
              以「辣」比喻无法被定义的个性与气场——「I'm too spicy」，拒绝被贴标签，MY WORLD 开启后的首张主打，夏日复古 Disco 风。
            </p>
            <p class="lyric-note">2023.05 · MY WORLD 主打 · 复古舞厅视觉</p>
            <div class="lyric-actions">
              <button type="button" class="lyric-mv-link" data-song="spicy">▶ 播放 MV</button>
            </div>
          </article>
          <article class="lyric-card" id="lyric-girls" data-song="girls">
            <h3>Girls</h3>
            <p class="album-ref">迷你二辑《Girls》· 2022</p>
            <p class="lyric-ko">「We are the Girls · 我们即 Girls」</p>
            <p class="lyric-zh">
              SMCU 叙事关键曲——与 ae 成员在 KWANGYA 并肩作战，「Girls will be girls」，以史诗感编曲宣告 aespa 作为「Girls」的团结与力量。
            </p>
            <p class="lyric-note">2022.07 · 与 Black Mamba 对决 · 双 MV 叙事</p>
            <div class="lyric-actions">
              <button type="button" class="lyric-mv-link" data-song="girls">▶ 播放 MV</button>
            </div>
          </article>
          <article class="lyric-card" id="lyric-hot-mess" data-song="hot-mess">
            <h3>Hot Mess</h3>
            <p class="album-ref">日本出道单曲 · 2024</p>
            <p class="lyric-ko">「Hot Mess · 混乱中依然闪耀」</p>
            <p class="lyric-zh">
              aespa 日本正式出道曲，以「Hot Mess」形容看似混乱却充满魅力的状态——在 J-Pop 与 K-Pop 融合曲风中开启日本市场篇章。
            </p>
            <p class="lyric-note">2024.07 · 日本出道 · 东京活动起点</p>
            <div class="lyric-actions">
              <button type="button" class="lyric-mv-link" data-song="hot-mess">▶ 播放 MV</button>
            </div>
          </article>
        </div>"""
    html = html.replace(
        """          </article>
        </div>
        <p style="margin-top: 14px; font-size: 0.78rem; color: var(--muted)">
          以上为代表性段落的中文意译与解读""",
        """          </article>""" + new_lyrics + """
        <p style="margin-top: 14px; font-size: 0.78rem; color: var(--muted)">
          以上为代表性段落的中文意译与解读""",
    )

    # Discography: fix track count + filters + categories
    html = html.replace("全 10 曲", "全 7 曲")
    html = html.replace(
        '<div class="disc-grid">',
        """<div class="disc-filters" id="discFilters">
          <button type="button" class="disc-filter active" data-filter="all">全部</button>
          <button type="button" class="disc-filter" data-filter="full">正规</button>
          <button type="button" class="disc-filter" data-filter="mini">迷你</button>
          <button type="button" class="disc-filter" data-filter="single">单曲</button>
          <button type="button" class="disc-filter" data-filter="jp">日专</button>
        </div>
        <div class="disc-grid" id="discGrid">""",
    )
    html = html.replace(
        '<div class="disc-row">\n            <div class="disc-type">2020 出道</div>',
        '<div class="disc-row" data-cat="single">\n            <div class="disc-type">2020 出道</div>',
    )
    html = html.replace(
        '<div class="disc-row">\n            <div class="disc-type">2021 单曲</div>',
        '<div class="disc-row" data-cat="single">\n            <div class="disc-type">2021 单曲</div>',
    )
    html = html.replace(
        '<div class="disc-row">\n            <div class="disc-type">2021 迷你</div>',
        '<div class="disc-row" data-cat="mini">\n            <div class="disc-type">2021 迷你</div>',
    )
    html = html.replace(
        '<div class="disc-row">\n            <div class="disc-type">2022 迷你</div>',
        '<div class="disc-row" data-cat="mini">\n            <div class="disc-type">2022 迷你</div>',
    )
    html = html.replace(
        '<div class="disc-row">\n            <div class="disc-type">2023 迷你</div>',
        '<div class="disc-row" data-cat="mini">\n            <div class="disc-type">2023 迷你</div>',
    )
    html = html.replace(
        '<div class="disc-row">\n            <div class="disc-type">2024 正规</div>',
        '<div class="disc-row" data-cat="full">\n            <div class="disc-type">2024 正规</div>',
    )
    html = html.replace(
        '<div class="disc-row">\n            <div class="disc-type">2024 迷你</div>',
        '<div class="disc-row" data-cat="mini">\n            <div class="disc-type">2024 迷你</div>',
    )
    html = html.replace(
        '<div class="disc-row">\n            <div class="disc-type">2025 迷你</div>',
        '<div class="disc-row" data-cat="mini">\n            <div class="disc-type">2025 迷你</div>',
    )
    html = html.replace(
        '<div class="disc-row">\n            <div class="disc-type">2026 正规</div>',
        '<div class="disc-row" data-cat="full">\n            <div class="disc-type">2026 正规</div>',
    )
    html = html.replace(
        '<div class="disc-row">\n            <div class="disc-type">2024 日单</div>',
        '<div class="disc-row" data-cat="jp">\n            <div class="disc-type">2024 日单</div>',
    )

    # ae-chips
    html = html.replace(
        '<div class="ae-chip"><b>ae-KARINA</b>Rocket Puncher</div>',
        '<div class="ae-chip" role="button" tabindex="0" data-member="karina"><b>ae-KARINA</b>Rocket Puncher</div>',
    )
    html = html.replace(
        '<div class="ae-chip"><b>ae-GISELLE</b>Xenoglossy</div>',
        '<div class="ae-chip" role="button" tabindex="0" data-member="giselle"><b>ae-GISELLE</b>Xenoglossy</div>',
    )
    html = html.replace(
        '<div class="ae-chip"><b>ae-WINTER</b>Armamenter</div>',
        '<div class="ae-chip" role="button" tabindex="0" data-member="winter"><b>ae-WINTER</b>Armamenter</div>',
    )
    html = html.replace(
        '<div class="ae-chip"><b>ae-NINGNING</b>E.D Hacker</div>',
        '<div class="ae-chip" role="button" tabindex="0" data-member="ningning"><b>ae-NINGNING</b>E.D Hacker</div>',
    )

    # Member ids
    html = html.replace('<article class="member karina">', '<article class="member karina" id="member-karina">')
    html = html.replace('<article class="member giselle">', '<article class="member giselle" id="member-giselle">')
    html = html.replace('<article class="member winter">', '<article class="member winter" id="member-winter">')
    html = html.replace('<article class="member ningning">', '<article class="member ningning" id="member-ningning">')

    # Awards by year
    html = html.replace(
        """        <div class="awards">
          <span class="award">2020 APAN 最佳新歌手（海外）</span>
          <span class="award">2021 MAMA 最佳舞蹈表演（女团）</span>
          <span class="award">2021 Melon Music Awards 十大歌手</span>
          <span class="award">2022 首尔歌谣大赏 本赏</span>
          <span class="award">2023 Circle Chart Music Awards 多部门提名/获奖</span>
          <span class="award">历代 Melon 流媒体破亿单曲纪录保持者之一</span>
          <span class="award">Billboard / 多国 iTunes 榜单前列</span>
          <span class="award">2026 LEMONADE MV 24h 破千万播放</span>
        </div>""",
        """        <div class="awards-by-year">
          <div class="award-year-group">
            <h4>2026</h4>
            <div class="awards">
              <span class="award">LEMONADE MV 24h 破千万播放</span>
              <span class="award">多国 iTunes 专辑榜 #1</span>
            </div>
          </div>
          <div class="award-year-group">
            <h4>2023</h4>
            <div class="awards">
              <span class="award">Circle Chart Music Awards 多部门提名/获奖</span>
            </div>
          </div>
          <div class="award-year-group">
            <h4>2022</h4>
            <div class="awards">
              <span class="award">首尔歌谣大赏 本赏</span>
            </div>
          </div>
          <div class="award-year-group">
            <h4>2021</h4>
            <div class="awards">
              <span class="award">MAMA 最佳舞蹈表演（女团）</span>
              <span class="award">Melon Music Awards 十大歌手</span>
            </div>
          </div>
          <div class="award-year-group">
            <h4>2020</h4>
            <div class="awards">
              <span class="award">APAN 最佳新歌手（海外）</span>
            </div>
          </div>
          <div class="award-year-group">
            <h4>综合</h4>
            <div class="awards">
              <span class="award">历代 Melon 流媒体破亿单曲纪录保持者之一</span>
              <span class="award">Billboard / 多国 iTunes 榜单前列</span>
            </div>
          </div>
        </div>""",
    )

    # Replace inline scripts with app.js
    html = re.sub(r"\s*<script>.*?</script>\s*", "\n    ", html, flags=re.DOTALL)
    html = html.replace(
        '<button type="button" class="back-to-top" id="backToTop" aria-label="回到顶部">↑</button>',
        '<button type="button" class="back-to-top" id="backToTop" aria-label="回到顶部">↑</button>\n'
        '    <script src="app.js" defer></script>\n'
        '    <script>\n'
        '      if ("serviceWorker" in navigator) {\n'
        '        window.addEventListener("load", function () {\n'
        '          navigator.serviceWorker.register("sw.js").catch(function () {});\n'
        '        });\n'
        '      }\n'
        '    </script>',
    )

    return html


def extra_js() -> str:
    return """
(function () {
  var lyricLink = document.getElementById("mvLyricLink");
  if (!lyricLink) return;

  function updateLyricLink(song) {
    var card = document.getElementById("lyric-" + song);
    if (card) {
      lyricLink.classList.remove("hidden");
      lyricLink.dataset.song = song;
    } else {
      lyricLink.classList.add("hidden");
      lyricLink.removeAttribute("data-song");
    }
  }

  lyricLink.addEventListener("click", function () {
    var song = lyricLink.dataset.song;
    if (!song) return;
    var card = document.getElementById("lyric-" + song);
    if (card) {
      document.querySelectorAll(".lyric-card.highlight").forEach(function (c) {
        c.classList.remove("highlight");
      });
      card.classList.add("highlight");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  window.aespaUpdateLyricLink = updateLyricLink;
})();

(function () {
  document.querySelectorAll(".ae-chip[data-member]").forEach(function (chip) {
    function go() {
      var target = document.getElementById("member-" + chip.dataset.member);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    chip.addEventListener("click", go);
    chip.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  });
})();

(function () {
  var filters = document.querySelectorAll("#discFilters .disc-filter");
  var rows = document.querySelectorAll("#discGrid .disc-row");
  if (!filters.length || !rows.length) return;

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cat = btn.dataset.filter;
      filters.forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      rows.forEach(function (row) {
        var show = cat === "all" || row.dataset.cat === cat;
        row.classList.toggle("is-hidden", !show);
      });
    });
  });
})();

(function () {
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return;

  document.querySelectorAll(".member-gallery").forEach(function (gallery) {
    var track = gallery.querySelector(".member-gallery-track");
    if (!track) return;
    var timer = null;
    var paused = false;

    function photoCount() {
      return track.querySelectorAll(".member-photo, picture.member-photo-wrap").length;
    }

    function currentIndex() {
      var w = track.clientWidth || 1;
      return Math.round(track.scrollLeft / w);
    }

    function tick() {
      if (paused || photoCount() <= 1) return;
      var next = (currentIndex() + 1) % photoCount();
      track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
    }

    function start() {
      clearInterval(timer);
      timer = setInterval(tick, 4500);
    }

    function pause() {
      paused = true;
      gallery.classList.add("is-autoplay-paused");
      clearInterval(timer);
    }

    gallery.addEventListener("mouseenter", pause);
    gallery.addEventListener("focusin", pause);
    gallery.addEventListener("touchstart", pause, { passive: true });
    gallery.addEventListener("mouseleave", function () {
      paused = false;
      gallery.classList.remove("is-autoplay-paused");
      start();
    });
    gallery.addEventListener("focusout", function () {
      if (!gallery.contains(document.activeElement)) {
        paused = false;
        gallery.classList.remove("is-autoplay-paused");
        start();
      }
    });

    start();
  });
})();

(function () {
  if (!window.aespaUpdateLyricLink) return;
  var tab = document.querySelector("#mvTabs .mv-tab.active");
  if (tab) window.aespaUpdateLyricLink(tab.dataset.song);
})();
"""


def patch_mv_js(js: str) -> str:
    """Inject lyric link updates into MV player script."""
    js = js.replace(
        "function highlightLyric(song) {",
        "function highlightLyric(song) {\n"
        "          if (window.aespaUpdateLyricLink) window.aespaUpdateLyricLink(song);",
    )
    return js


def wrap_member_photos(html: str) -> str:
    """Wrap member gallery imgs in picture with webp source."""

    def repl(m: re.Match) -> str:
        alt = m.group(1)
        src = m.group(2)
        webp = src.rsplit(".", 1)[0] + ".webp"
        return (
            f'<picture class="member-photo-wrap">'
            f'<source type="image/webp" srcset="images/{webp}" />'
            f'<img class="member-photo" src="images/{src}" alt="{alt}" loading="lazy" decoding="async" />'
            f"</picture>"
        )

    return re.sub(
        r'<img class="member-photo" src="images/([^"]+)" alt="([^"]*)" loading="lazy" decoding="async" />',
        lambda m: (
            f'<picture class="member-photo-wrap">'
            f'<source type="image/webp" srcset="images/{m.group(1).rsplit(".", 1)[0]}.webp" />'
            f'<img class="member-photo" src="images/{m.group(1)}" alt="{m.group(2)}" loading="lazy" decoding="async" />'
            f"</picture>"
        ),
        html,
    )


def make_webp() -> None:
    if not Image:
        print("Pillow not installed; skipping WebP")
        return
    for name in WEBP_IMAGES:
        src = IMAGES / name
        if not src.exists():
            continue
        dest = IMAGES / (src.stem + ".webp")
        with Image.open(src) as im:
            im.save(dest, "WEBP", quality=82, method=6)
        print("webp:", dest.name)


def make_og_share() -> None:
    if not Image:
        return
    src = IMAGES / "lemonade-cover.jpg"
    if not src.exists():
        return
    with Image.open(src) as im:
        im = im.convert("RGB")
        w, h = im.size
        target_w, target_h = 1200, 630
        scale = max(target_w / w, target_h / h)
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        left = (im.width - target_w) // 2
        top = (im.height - target_h) // 2
        im = im.crop((left, top, left + target_w, top + target_h))
        im.save(IMAGES / "og-share.jpg", "JPEG", quality=88, optimize=True)
    print("og-share.jpg created")


def write_manifest() -> None:
    (ROOT / "manifest.json").write_text(
        """{
  "name": "aespa 女团资料",
  "short_name": "aespa",
  "description": "aespa 成员、MV、歌词与 LEMONADE 最新回归资料",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#050508",
  "theme_color": "#a855f7",
  "lang": "zh-CN",
  "icons": [
    { "src": "images/favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" },
    { "src": "images/lemonade-cover.jpg", "sizes": "512x512", "type": "image/jpeg", "purpose": "any maskable" }
  ]
}
""",
        encoding="utf-8",
    )


def write_sw() -> None:
    (ROOT / "sw.js").write_text(
        """const CACHE = "aespa-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./images/favicon.svg",
  "./images/lemonade-cover.jpg",
  "./images/og-share.jpg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const net = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && e.request.url.startsWith(self.location.origin)) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
""",
        encoding="utf-8",
    )


def main() -> None:
    html = SRC.read_text(encoding="utf-8")
    css = extract_css(html) + extra_css()
    js = patch_mv_js(extract_scripts(html)) + extra_js()
    html = patch_html(html)
    html = wrap_member_photos(html)

    (ROOT / "style.css").write_text(css, encoding="utf-8")
    (ROOT / "app.js").write_text(js, encoding="utf-8")
    SRC.write_text(html, encoding="utf-8")
    write_manifest()
    write_sw()
    make_og_share()
    make_webp()
    print("Build complete.")


if __name__ == "__main__":
    main()
