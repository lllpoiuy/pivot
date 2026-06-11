/* ============================================================
   PIVOT — nav scroll-spy + scroll reveals
   Highlights the nav link of the section in view, and fades
   body blocks in as they enter the viewport. Both degrade
   gracefully: no JS / no IO / reduced motion → static page.
   ============================================================ */
(function () {
  "use strict";

  if (!("IntersectionObserver" in window)) return;

  function init() {
    // --- Reading-progress bar under the nav --------------------------------
    var nav = document.querySelector(".nav");
    if (nav) {
      var bar = document.createElement("div");
      bar.className = "nav-progress";
      nav.appendChild(bar);
      var ticking = false;
      var onScroll = function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var doc = document.documentElement;
          var max = doc.scrollHeight - window.innerHeight;
          var p = max > 0 ? Math.min(1, doc.scrollTop / max) : 0;
          bar.style.transform = "scaleX(" + p + ")";
          ticking = false;
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    // --- Scroll-spy -------------------------------------------------------
    var links = document.querySelectorAll('.nav-links a[href^="#"]');
    var map = {};
    for (var i = 0; i < links.length; i++) {
      map[links[i].getAttribute("href").slice(1)] = links[i];
    }
    var current = null;
    var spy = new IntersectionObserver(function (entries) {
      for (var j = 0; j < entries.length; j++) {
        if (!entries[j].isIntersecting) continue;
        if (current) current.classList.remove("is-active");
        current = map[entries[j].target.id] || null;
        if (current) current.classList.add("is-active");
      }
    }, { rootMargin: "-20% 0px -70% 0px" });
    for (var id in map) {
      var sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    }

    // --- Scroll reveals ----------------------------------------------------
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var blocks = document.querySelectorAll(
      "main .section .media, main .sec-head, main .prose, main .quote, main .lede"
    );
    var io = new IntersectionObserver(function (entries) {
      for (var k = 0; k < entries.length; k++) {
        if (entries[k].isIntersecting) {
          entries[k].target.classList.add("is-in");
          io.unobserve(entries[k].target);
        }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    for (var m = 0; m < blocks.length; m++) {
      blocks[m].classList.add("reveal");
      io.observe(blocks[m]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
