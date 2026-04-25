(function () {
  "use strict";

  const script = document.currentScript;
  if (!script) return;

  const slug = script.dataset.location;
  if (!slug) {
    console.error("[EFR] <script data-location=\"...\"> is required");
    return;
  }

  const scriptUrl = new URL(script.src, location.href);
  const baseUrl = scriptUrl.href.replace(/widget\.js(\?.*)?$/, "");

  injectFontsOnce();
  injectStylesheetOnce(baseUrl + "widget.css");

  const target =
    document.getElementById("ef-reviews-" + slug) ||
    (function () {
      const el = document.createElement("div");
      el.id = "ef-reviews-" + slug;
      script.parentNode.insertBefore(el, script);
      return el;
    })();

  target.classList.add("efr-root");
  target.dataset.efrSlug = slug;
  target.innerHTML = skeletonMarkup();

  fetch(baseUrl + "data/" + encodeURIComponent(slug) + ".json", { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      render(target, data);
    })
    .catch(function (err) {
      console.error("[EFR] Failed to load " + slug + ".json", err);
      target.innerHTML = '<div class="efr-error">Unable to load reviews right now.</div>';
    });

  function injectFontsOnce() {
    if (document.querySelector('link[data-efr-fonts]')) return;
    const pre1 = document.createElement("link");
    pre1.rel = "preconnect";
    pre1.href = "https://fonts.googleapis.com";
    pre1.setAttribute("data-efr-fonts", "1");
    const pre2 = document.createElement("link");
    pre2.rel = "preconnect";
    pre2.href = "https://fonts.gstatic.com";
    pre2.crossOrigin = "";
    pre2.setAttribute("data-efr-fonts", "2");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Source+Sans+Pro:ital,wght@0,200;0,300;0,400;0,600;0,700;1,400&display=swap";
    link.setAttribute("data-efr-fonts", "3");
    document.head.appendChild(pre1);
    document.head.appendChild(pre2);
    document.head.appendChild(link);
  }

  function injectStylesheetOnce(href) {
    if (document.querySelector('link[data-efr-stylesheet]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-efr-stylesheet", "1");
    document.head.appendChild(link);
  }

  function skeletonMarkup() {
    return (
      '<div class="efr-skeleton">' +
      '<div class="efr-skeleton-header"></div>' +
      '<div class="efr-skeleton-grid">' +
      '<div class="efr-skeleton-card"></div>'.repeat(6) +
      "</div></div>"
    );
  }

  const INITIAL_REVIEWS = 5;
  const LOAD_MORE_BATCH = 4;

  function render(root, data) {
    const reviews = (data.reviews || []).filter(function (r) {
      return r.author && !String(r.author).startsWith("REPLACE_");
    });

    const rating = typeof data.rating === "number" ? data.rating : null;
    const count = data.userRatingCount || reviews.length;
    const placeId = data.placeId || "";
    const writeReviewUrl = placeId
      ? "https://search.google.com/local/writereview?placeid=" + encodeURIComponent(placeId)
      : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(data.displayName || "");

    const reviewMarkup = reviews
      .map(function (r, i) { return reviewCardMarkup(r, i >= INITIAL_REVIEWS); })
      .join("");

    const hiddenCount = Math.max(0, reviews.length - INITIAL_REVIEWS);
    const loadMore = hiddenCount > 0
      ? '<div class="efr-loadmore">' +
        '<button class="efr-loadmore-btn" type="button" data-efr-loadmore>' +
        '<span>Load more reviews</span>' +
        '<span class="efr-loadmore-count" data-efr-remaining="' + hiddenCount + '">' + hiddenCount + ' more</span>' +
        '<svg class="efr-loadmore-icon" viewBox="0 0 16 12" aria-hidden="true">' +
        '<path d="M2 4l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
        "</svg>" +
        "</button></div>"
      : "";

    root.innerHTML =
      headerMarkup(rating, count, writeReviewUrl) +
      '<div class="efr-grid">' +
      summaryCardMarkup(data.summary, count) +
      reviewMarkup +
      "</div>" +
      loadMore;

    wireAnimations(root);
    wireLoadMore(root);
  }

  function headerMarkup(rating, count, ctaUrl) {
    return (
      '<div class="efr-header">' +
      '<div class="efr-header-left">' +
      '<div class="efr-brand">' +
      googleLogoSvg() +
      '<span class="efr-brand-text">Reviews</span>' +
      "</div>" +
      (rating !== null
        ? '<div class="efr-rating">' +
          '<span class="efr-rating-value">' + rating.toFixed(1) + "</span>" +
          starsMarkup(rating, "efr-stars-lg") +
          (count ? '<span class="efr-rating-count">(' + count + ")</span>" : "") +
          "</div>"
        : "") +
      "</div>" +
      '<a class="efr-cta" href="' + ctaUrl + '" target="_blank" rel="noopener noreferrer">' +
      "<span>Review us on Google</span>" +
      '<svg class="efr-cta-arrow" viewBox="0 0 16 10" aria-hidden="true">' +
      '<path d="M0 5h14M10 0l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>" +
      "</a>" +
      "</div>"
    );
  }

  function summaryCardMarkup(summary, count) {
    const title = (summary && summary.title) || "";
    const body = (summary && summary.summary) || "";
    if (!body) return "";
    return (
      '<article class="efr-card efr-card-summary" data-efr-animate>' +
      '<div class="efr-summary-emblem">' +
      '<div class="efr-summary-icon">' + sparkleSvg() + "</div>" +
      "<div>" +
      '<div class="efr-summary-label">AI-Generated Summary' +
      '<span class="efr-summary-label-sub">Based on ' + count + ' Google reviews</span>' +
      "</div>" +
      "</div>" +
      "</div>" +
      starsMarkup(5, "efr-stars-md") +
      (title ? '<h3 class="efr-summary-title">' + escapeHtml(title) + "</h3>" : "") +
      '<p class="efr-summary-body" data-efr-typewriter>' + escapeHtml(body) + "</p>" +
      "</article>"
    );
  }

  function reviewCardMarkup(review, hidden) {
    const name = escapeHtml(review.author || "Anonymous");
    const relative = escapeHtml(review.relativeTime || formatRelative(review.publishTime) || "");
    const text = review.text || "";
    const isLong = text.length > 220;
    const short = isLong ? escapeHtml(text.slice(0, 200).trim()) + "…" : escapeHtml(text);
    const full = escapeHtml(text);
    const avatar = avatarMarkup(review);
    const hiddenClass = hidden ? " efr-hidden" : "";

    return (
      '<article class="efr-card efr-card-review' + hiddenClass + '" data-efr-animate>' +
      '<header class="efr-card-header">' +
      avatar +
      '<div class="efr-card-head-text">' +
      '<div class="efr-author">' + name + verifiedBadgeSvg() + "</div>" +
      '<div class="efr-card-sub">' + relative + "</div>" +
      "</div></header>" +
      starsMarkup(review.rating || 0, "efr-stars-md") +
      '<p class="efr-review-text"' + (isLong ? ' data-efr-expandable="1"' : "") + ">" +
      (isLong
        ? '<span class="efr-text-short">' + short + '<button type="button" class="efr-readmore">Read more</button></span>' +
          '<span class="efr-text-full" hidden>' + full + "</span>"
        : short) +
      "</p>" +
      "</article>"
    );
  }

  function avatarMarkup(review) {
    if (review.avatarUrl) {
      return (
        '<div class="efr-avatar efr-avatar-photo">' +
        '<img src="' + review.avatarUrl + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.className=\'efr-avatar\';this.parentNode.style.background=\'' + initialsBg(review.author) + '\';this.parentNode.innerHTML=\'' + initials(review.author) + '\'+this.parentNode.querySelector(\'.efr-g-corner\').outerHTML">' +
        googleCornerSvg() +
        "</div>"
      );
    }
    return (
      '<div class="efr-avatar" style="background:' + initialsBg(review.author) + '">' +
      initials(review.author) +
      googleCornerSvg() +
      "</div>"
    );
  }

  function starsMarkup(rating, sizeClass) {
    const full = Math.floor(rating);
    const frac = rating - full;
    const html = [];
    for (let i = 0; i < 5; i++) {
      const fill = i < full ? 1 : i === full ? frac : 0;
      html.push(starSvg(fill));
    }
    return '<div class="efr-stars ' + sizeClass + '">' + html.join("") + "</div>";
  }

  function starSvg(fill) {
    const pct = Math.max(0, Math.min(1, fill)) * 100;
    const id = "efr-s-" + Math.random().toString(36).slice(2, 9);
    return (
      '<svg class="efr-star" viewBox="0 0 24 24" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" x2="1" y1="0" y2="0">' +
      '<stop offset="' + pct + '%" stop-color="currentColor"/>' +
      '<stop offset="' + pct + '%" stop-color="transparent"/>' +
      "</linearGradient></defs>" +
      '<path d="M12 2.8l2.7 6.1 6.7.6-5 4.5 1.5 6.5L12 17.1l-5.9 3.4 1.5-6.5-5-4.5 6.7-.6z" ' +
      'fill="url(#' + id + ')" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>' +
      "</svg>"
    );
  }

  function googleLogoSvg() {
    return (
      '<svg class="efr-google-logo" viewBox="0 0 272 92" aria-label="Google">' +
      '<path fill="#EA4335" d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44S80.99 39.2 80.99 47.18c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z"/>' +
      '<path fill="#FBBC05" d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.85 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z"/>' +
      '<path fill="#4285F4" d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-7.81-5.21-13.52-11.84-13.52-6.72 0-12.35 5.71-12.35 13.52 0 7.73 5.63 13.36 12.35 13.36 6.63 0 11.84-5.63 11.84-13.36z"/>' +
      '<path fill="#34A853" d="M225 3v65h-9.5V3h9.5z"/>' +
      '<path fill="#EA4335" d="M262.02 54.48l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-23.27-7.98l19.82-8.23c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.93z"/>' +
      '<path fill="#4285F4" d="M35.29 41.41V32H67c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C16.32 69.35.36 53.89.36 34.91.36 15.93 16.32.47 35.3.47c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65l-22.49.01z"/>' +
      "</svg>"
    );
  }

  function sparkleSvg() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z M18 14.5l.8 2.2L21 17.5l-2.2.8L18 20.5l-.8-2.2L15 17.5l2.2-.8z" fill="currentColor"/>' +
      "</svg>"
    );
  }

  function verifiedBadgeSvg() {
    return (
      '<svg class="efr-verified" viewBox="0 0 16 16" aria-label="Verified">' +
      '<path fill="#309EDB" d="M8 .8l1.7 1.3 2.1-.3 1 1.9 1.9 1-.3 2.1L15.7 8l-1.3 1.7.3 2.1-1.9 1-1 1.9-2.1-.3L8 15.2l-1.7-1.3-2.1.3-1-1.9-1.9-1 .3-2.1L.3 8l1.3-1.7-.3-2.1 1.9-1 1-1.9 2.1.3z"/>' +
      '<path fill="#fff" d="M7 10.4L4.6 8 5.8 6.8 7 8l3.2-3.2L11.4 6z"/>' +
      "</svg>"
    );
  }

  function googleCornerSvg() {
    return (
      '<svg class="efr-g-corner" viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="12" fill="#fff"/>' +
      '<path fill="#4285F4" d="M20.5 12.2c0-.6-.1-1.2-.2-1.8h-8.1v3.4h4.7c-.2 1.1-.8 2-1.8 2.7v2.3h2.9c1.7-1.6 2.5-3.9 2.5-6.6z"/>' +
      '<path fill="#34A853" d="M12.2 20.5c2.4 0 4.4-.8 5.9-2.2l-2.9-2.3c-.8.5-1.8.8-3 .8-2.3 0-4.3-1.6-5-3.7H4.2v2.4c1.5 3 4.6 5 8 5z"/>' +
      '<path fill="#FBBC05" d="M7.2 13.1c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V7.3H4.2c-.6 1.3-1 2.7-1 4.1s.4 2.8 1 4.1l3-2.4z"/>' +
      '<path fill="#EA4335" d="M12.2 6.9c1.3 0 2.5.4 3.4 1.3l2.6-2.6C16.6 4.2 14.6 3.5 12.2 3.5c-3.4 0-6.5 2-8 5l3 2.4c.7-2.1 2.7-3.7 5-4z"/>' +
      "</svg>"
    );
  }

  function initials(name) {
    if (!name) return "?";
    const parts = String(name).trim().split(/\s+/);
    const first = (parts[0] && parts[0][0]) || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  function initialsBg(name) {
    const palette = ["#E57373", "#BA68C8", "#64B5F6", "#4DB6AC", "#81C784", "#FFB74D", "#A1887F", "#90A4AE", "#7986CB"];
    const seed = String(name || "?").split("").reduce(function (a, c) { return a + c.charCodeAt(0); }, 0);
    return palette[seed % palette.length];
  }

  function formatRelative(iso) {
    if (!iso) return "";
    const then = Date.parse(iso);
    if (isNaN(then)) return "";
    const days = Math.max(1, Math.floor((Date.now() - then) / 86400000));
    if (days < 30) return days + " day" + (days === 1 ? "" : "s") + " ago";
    const months = Math.floor(days / 30);
    if (months < 12) return months + " month" + (months === 1 ? "" : "s") + " ago";
    const years = Math.floor(months / 12);
    return years + " year" + (years === 1 ? "" : "s") + " ago";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function wireAnimations(root) {
    const cards = Array.prototype.slice.call(root.querySelectorAll("[data-efr-animate]"));

    if (!("IntersectionObserver" in window)) {
      cards.forEach(function (c) { c.classList.add("efr-in"); });
      runTypewriter(root, true);
      return;
    }

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const idx = cards.indexOf(entry.target);
          entry.target.style.transitionDelay = Math.min(idx, 10) * 60 + "ms";
          entry.target.classList.add("efr-in");
          io.unobserve(entry.target);
          if (entry.target.classList.contains("efr-card-summary")) {
            setTimeout(function () { runTypewriter(root, false); }, 300);
          }
        }
      });
    }, { threshold: 0.15 });

    cards.forEach(function (c) { io.observe(c); });

    root.addEventListener("click", function (e) {
      const btn = e.target.closest(".efr-readmore");
      if (!btn) return;
      const p = btn.closest("[data-efr-expandable]");
      if (!p) return;
      p.querySelector(".efr-text-short").hidden = true;
      p.querySelector(".efr-text-full").hidden = false;
    });
  }

  function wireLoadMore(root) {
    const btn = root.querySelector("[data-efr-loadmore]");
    if (!btn) return;

    btn.addEventListener("click", function () {
      const hidden = Array.prototype.slice.call(
        root.querySelectorAll(".efr-card-review.efr-hidden"),
      );
      const batch = hidden.slice(0, LOAD_MORE_BATCH);
      batch.forEach(function (card, i) {
        card.classList.remove("efr-hidden");
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            card.style.transitionDelay = i * 70 + "ms";
            card.classList.add("efr-in");
          });
        });
      });

      const remaining = hidden.length - batch.length;
      const remEl = btn.querySelector(".efr-loadmore-count");
      if (remaining <= 0) {
        const wrap = btn.parentNode;
        wrap.classList.add("efr-loadmore-done");
        setTimeout(function () { wrap.style.display = "none"; }, 320);
      } else if (remEl) {
        remEl.textContent = remaining + " more";
        remEl.dataset.efrRemaining = String(remaining);
      }
    });
  }

  function runTypewriter(root, instant) {
    const el = root.querySelector("[data-efr-typewriter]");
    if (!el || el.dataset.efrTyped) return;
    const full = el.textContent;
    el.dataset.efrTyped = "1";
    if (instant) return;
    el.textContent = "";
    el.classList.add("efr-typing");
    let i = 0;
    const tick = function () {
      if (i > full.length) {
        el.classList.remove("efr-typing");
        return;
      }
      el.textContent = full.slice(0, i);
      i++;
      const ch = full[i - 1];
      const delay = ch === "." || ch === "," ? 90 : ch === " " ? 16 : 20;
      setTimeout(tick, delay);
    };
    tick();
  }
})();
