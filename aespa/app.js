(function () {
        var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var isMobile = window.matchMedia("(max-width: 720px)").matches;
        var slides = document.querySelectorAll(".bg-slide");

        function ensureSlideSrc(slide) {
          if (!slide || slide.src || !slide.dataset.src) return;
          slide.src = slide.dataset.src;
        }

        if (slides.length && !reducedMotion) {
          var idx = 0;
          ensureSlideSrc(slides[(idx + 1) % slides.length]);
          setInterval(function () {
            var nextIdx = (idx + 1) % slides.length;
            ensureSlideSrc(slides[nextIdx]);
            ensureSlideSrc(slides[(nextIdx + 1) % slides.length]);
            slides[idx].classList.remove("active");
            idx = nextIdx;
            slides[idx].classList.add("active");
          }, 5500);
        }

        var canvas = document.getElementById("bgCanvas");
        if (!canvas || reducedMotion) return;
        var ctx = canvas.getContext("2d");
        var dots = [];
        var count = isMobile ? 22 : 42;
        var running = true;
        var rafId = 0;

        function resize() {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener("resize", resize);

        for (var i = 0; i < count; i++) {
          dots.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            r: Math.random() * 1.6 + 0.6,
            hue: Math.random() > 0.5 ? 270 : Math.random() > 0.5 ? 320 : 210,
          });
        }

        function draw() {
          if (!running) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          for (var a = 0; a < dots.length; a++) {
            for (var b = a + 1; b < dots.length; b++) {
              var dx = dots[a].x - dots[b].x;
              var dy = dots[a].y - dots[b].y;
              var dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 130) {
                ctx.strokeStyle = "hsla(" + dots[a].hue + ", 70%, 65%, " + (1 - dist / 130) * 0.22 + ")";
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(dots[a].x, dots[a].y);
                ctx.lineTo(dots[b].x, dots[b].y);
                ctx.stroke();
              }
            }
          }
          for (var j = 0; j < dots.length; j++) {
            var d = dots[j];
            d.x += d.vx;
            d.y += d.vy;
            if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
            if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
            ctx.fillStyle = "hsla(" + d.hue + ", 80%, 72%, 0.75)";
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fill();
          }
          rafId = requestAnimationFrame(draw);
        }

        document.addEventListener("visibilitychange", function () {
          if (document.hidden) {
            running = false;
            cancelAnimationFrame(rafId);
          } else {
            running = true;
            draw();
          }
        });

        draw();
      })();

(function () {
        var navLinks = document.querySelectorAll("#mainNav a[data-nav]");
        var navInner = document.querySelector(".nav-inner");
        var sections = document.querySelectorAll("main section[id]");
        if (!navLinks.length || !sections.length) return;

        function centerNavLink(link) {
          if (!navInner || !link || window.innerWidth > 720) return;
          var left = link.offsetLeft - navInner.clientWidth / 2 + link.clientWidth / 2;
          navInner.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
        }

        function setActiveNav(id) {
          navLinks.forEach(function (link) {
            var active = link.dataset.nav === id;
            link.classList.toggle("active", active);
            if (active) {
              link.setAttribute("aria-current", "true");
              centerNavLink(link);
            } else {
              link.removeAttribute("aria-current");
            }
          });
        }

        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) setActiveNav(entry.target.id);
            });
          },
          { rootMargin: "-42% 0px -48% 0px", threshold: 0 }
        );

        sections.forEach(function (section) {
          observer.observe(section);
        });

        if (location.hash) {
          var hash = location.hash.replace("#", "");
          if (document.getElementById(hash)) setActiveNav(hash);
        } else {
          setActiveNav(sections[0].id);
        }
      })();

(function () {
        var btn = document.getElementById("backToTop");
        if (!btn) return;
        window.addEventListener(
          "scroll",
          function () {
            btn.classList.toggle("visible", window.scrollY > 400);
          },
          { passive: true }
        );
        btn.addEventListener("click", function () {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      })();

(function () {
        document.querySelectorAll(".comeback-btn[data-song], .update-link[data-song], .hero-cta-btn[data-song]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (window.aespaSelectMv) window.aespaSelectMv(btn.dataset.song, false);
          });
        });
      })();

document.querySelectorAll(".member-gallery").forEach(function (gallery) {
        var track = gallery.querySelector(".member-gallery-track");
        var dotsWrap = gallery.querySelector(".member-gallery-dots");
        var prevBtn = gallery.querySelector(".member-gallery-arrow.prev");
        var nextBtn = gallery.querySelector(".member-gallery-arrow.next");
        var hint = gallery.querySelector(".member-gallery-hint");
        var visual = gallery.closest(".member-visual");
        var photos = [];

        gallery.querySelectorAll(".member-photo").forEach(function (img) {
          img.addEventListener("error", function () {
            img.remove();
            rebuild();
          });
          photos.push(img);
        });

        function rebuild() {
          photos = Array.from(track.querySelectorAll(".member-photo"));
          dotsWrap.innerHTML = "";
          if (!photos.length) {
            if (visual) visual.classList.remove("has-photo");
            return;
          }
          if (visual) visual.classList.add("has-photo");
          if (hint) hint.textContent = "滑动 · " + photos.length + " 张";
          photos.forEach(function (_, i) {
            var dot = document.createElement("button");
            dot.type = "button";
            dot.className = "member-gallery-dot" + (i === 0 ? " active" : "");
            dot.setAttribute("aria-label", "第 " + (i + 1) + " 张");
            dot.addEventListener("click", function () {
              goTo(i);
            });
            dotsWrap.appendChild(dot);
          });
          updateDots();
        }

        function slideWidth() {
          return track.clientWidth || 1;
        }

        function currentIndex() {
          return Math.round(track.scrollLeft / slideWidth());
        }

        function updateDots() {
          var idx = currentIndex();
          dotsWrap.querySelectorAll(".member-gallery-dot").forEach(function (dot, i) {
            dot.classList.toggle("active", i === idx);
          });
        }

        function goTo(index) {
          var max = photos.length - 1;
          var idx = Math.max(0, Math.min(index, max));
          track.scrollTo({ left: idx * slideWidth(), behavior: "smooth" });
        }

        track.addEventListener("scroll", function () {
          window.requestAnimationFrame(updateDots);
        }, { passive: true });

        if (prevBtn) {
          prevBtn.addEventListener("click", function () {
            goTo(currentIndex() - 1);
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener("click", function () {
            goTo(currentIndex() + 1);
          });
        }

        rebuild();
      });

(function () {
        const frame = document.getElementById("mvFrame");
        const poster = document.getElementById("mvPoster");
        const playBtn = document.getElementById("mvPlayBtn");
        const openLink = document.getElementById("mvOpenLink");
        const titleEl = document.getElementById("mvTitle");
        const metaEl = document.getElementById("mvMeta");
        const tabs = document.querySelectorAll("#mvTabs .mv-tab");
        const platformBtns = document.querySelectorAll("#mvPlatform .mv-platform-btn");
        let platform = "bilibili";
        let activeTab = document.querySelector("#mvTabs .mv-tab.active");
        let started = false;

        function bilibiliUrl(tab) {
          return (
            "https://player.bilibili.com/player.html?isOutside=true&aid=" +
            tab.dataset.aid +
            "&bvid=" +
            tab.dataset.bvid +
            "&cid=" +
            tab.dataset.cid +
            "&p=1&as_wide=1&high_quality=1&danmaku=0"
          );
        }

        function youtubeUrl(tab) {
          return (
            "https://www.youtube-nocookie.com/embed/" +
            tab.dataset.id +
            "?rel=0&modestbranding=1&playsinline=1"
          );
        }

        function externalUrl(tab) {
          if (platform === "bilibili") {
            return "https://www.bilibili.com/video/" + tab.dataset.bvid + "/";
          }
          return "https://www.youtube.com/watch?v=" + tab.dataset.id;
        }

        function embedUrl(tab) {
          return platform === "bilibili" ? bilibiliUrl(tab) : youtubeUrl(tab);
        }

        function updateMeta(tab) {
          frame.title = "aespa " + tab.dataset.title + " MV";
          titleEl.textContent = tab.dataset.title;
          metaEl.textContent = tab.dataset.meta;
          openLink.href = externalUrl(tab);
          openLink.textContent =
            platform === "bilibili" ? "在 B 站新窗口打开 ↗" : "在 YouTube 新窗口打开 ↗";
        }

        function startPlayer(tab) {
          if (!tab) return;
          activeTab = tab;
          updateMeta(tab);
          frame.src = embedUrl(tab);
          poster.classList.add("hidden");
          started = true;
        }

        function switchVideo(tab, autoplay) {
          if (!tab) return;
          activeTab = tab;
          updateMeta(tab);
          if (autoplay || started) {
            frame.src = embedUrl(tab);
            poster.classList.add("hidden");
            started = true;
          } else {
            frame.removeAttribute("src");
            poster.classList.remove("hidden");
          }
        }

        function highlightLyric(song) {
          if (window.aespaUpdateLyricLink) window.aespaUpdateLyricLink(song);
          if (!song) return;
          document.querySelectorAll(".lyric-card.highlight").forEach(function (card) {
            card.classList.remove("highlight");
          });
          var card = document.querySelector('.lyric-card[data-song="' + song + '"]');
          if (card) card.classList.add("highlight");
        }

        function selectBySong(song, scrollToLyrics) {
          var tab = document.querySelector('#mvTabs .mv-tab[data-song="' + song + '"]');
          if (!tab) return;
          tabs.forEach(function (b) {
            b.classList.remove("active");
          });
          tab.classList.add("active");
          startPlayer(tab);
          highlightLyric(song);
          if (scrollToLyrics) {
            var card = document.getElementById("lyric-" + song);
            if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }

        window.aespaSelectMv = function (song, scrollToLyrics) {
          selectBySong(song, scrollToLyrics);
          document.getElementById("mv").scrollIntoView({ behavior: "smooth", block: "start" });
        };

        playBtn.addEventListener("click", function () {
          startPlayer(activeTab);
        });

        tabs.forEach(function (btn) {
          btn.addEventListener("click", function () {
            tabs.forEach(function (b) {
              b.classList.remove("active");
            });
            btn.classList.add("active");
            switchVideo(btn, started);
            highlightLyric(btn.dataset.song);
          });
        });

        document.querySelectorAll(".lyric-mv-link").forEach(function (btn) {
          btn.addEventListener("click", function () {
            window.aespaSelectMv(btn.dataset.song, false);
          });
        });

        platformBtns.forEach(function (btn) {
          btn.addEventListener("click", function () {
            platform = btn.dataset.platform;
            platformBtns.forEach(function (b) {
              b.classList.remove("active");
            });
            btn.classList.add("active");
            switchVideo(activeTab, started);
          });
        });

        updateMeta(activeTab);
        highlightLyric(activeTab.dataset.song);
        startPlayer(activeTab);
      })();

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

(function () {
  var feed = document.getElementById("updatesFeed");
  var filters = document.querySelectorAll("#updateFilters .updates-filter");
  var countEl = document.getElementById("updateCount");
  var expandBtn = document.getElementById("updatesExpand");
  var cards = feed ? feed.querySelectorAll(".update-card") : [];
  var moreCards = feed ? feed.querySelectorAll(".update-card.update-more") : [];

  if (!feed || !cards.length) return;

  function visibleCards() {
    var expanded = feed.classList.contains("is-expanded");
    return Array.from(cards).filter(function (card) {
      if (card.classList.contains("is-hidden")) return false;
      if (card.classList.contains("update-more") && !expanded) return false;
      return true;
    });
  }

  function refreshCount() {
    if (!countEl) return;
    var n = visibleCards().length;
    countEl.textContent = n + " 条动态";
  }

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cat = btn.dataset.filter;
      filters.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      cards.forEach(function (card) {
        var show = cat === "all" || card.dataset.cat === cat;
        card.classList.toggle("is-hidden", !show);
      });
      refreshCount();
    });
  });

  if (expandBtn && moreCards.length) {
    expandBtn.addEventListener("click", function () {
      var open = feed.classList.toggle("is-expanded");
      expandBtn.setAttribute("aria-expanded", open ? "true" : "false");
      expandBtn.querySelector(".expand-label").textContent = open ? "收起较早动向" : "展开更多动向";
      refreshCount();
    });
  } else if (expandBtn) {
    expandBtn.classList.add("is-hidden");
  }

  refreshCount();
})();

(function () {
  var NEXT_EVENT = new Date("2026-08-02T11:00:00-05:00");
  var spotlight = document.getElementById("updatesCountdown");
  var sub = document.getElementById("updatesCountdownSub");
  var cdDays = document.getElementById("cdDays");
  var cdHours = document.getElementById("cdHours");
  var cdMins = document.getElementById("cdMins");

  if (!spotlight && !cdDays) return;

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function tick() {
    var now = new Date();
    var diff = NEXT_EVENT - now;
    if (diff <= 0) {
      if (spotlight) spotlight.textContent = "进行中";
      if (sub) sub.textContent = "Lollapalooza 芝加哥";
      if (cdDays) cdDays.textContent = "0";
      if (cdHours) cdHours.textContent = "00";
      if (cdMins) cdMins.textContent = "00";
      return;
    }
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    if (spotlight) spotlight.textContent = days + " 天";
    if (sub) sub.textContent = days + " 天 " + hours + " 时 · 芝加哥";
    if (cdDays) cdDays.textContent = String(days);
    if (cdHours) cdHours.textContent = pad(hours);
    if (cdMins) cdMins.textContent = pad(mins);
  }

  tick();
  setInterval(tick, 30000);
})();
