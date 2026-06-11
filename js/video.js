/* ============================================================
   PIVOT — lightweight custom video controls
   Enhances every <video> inside .media with play/pause, a
   scrubbable progress bar, time readout, mute and fullscreen.
   Self-contained: no external resources, inline SVG icons.
   ============================================================ */
(function () {
  "use strict";

  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    enterFs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h3V5H5v5h2V7zm10 0v3h2V5h-5v2h3zM7 17v-3H5v5h5v-2H7zm12-3h-2v3h-3v2h5v-5z"/></svg>',
    exitFs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9V6H7v1H5v2h4zm6 0h4V7h-2V6h-2v3zM9 15H5v2h2v1h2v-3zm6 0v3h2v-1h2v-2h-4z"/></svg>'
  };

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    t = Math.floor(t);
    var h = Math.floor(t / 3600);
    var m = Math.floor((t % 3600) / 60);
    var s = t % 60;
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    return h > 0 ? h + ":" + pad(m) + ":" + pad(s) : m + ":" + pad(s);
  }

  function enhance(video) {
    if (video.dataset.enhanced) return;
    video.dataset.enhanced = "1";

    // Let our bar own the controls; drop native ones if present.
    video.removeAttribute("controls");

    // Videos are presentation-only: always muted, no audio UI.
    video.muted = true;

    // The #t=… media fragment only picks the poster frame; playback
    // should still start from the beginning. On the first play, rewind
    // to 0 unless the user already scrubbed somewhere else.
    var fragment = ((video.currentSrc || video.src || "").match(/#t=([\d.]+)/) || [])[1];
    var posterTime = fragment ? parseFloat(fragment) : null;
    // While the poster frame is showing, the progress bar and time
    // readout pretend to be at 0:00 — the frame is a cover, not a
    // playback position. Cleared on first play or user seek.
    var pristine = posterTime !== null;
    video.addEventListener("play", function rewindOnce() {
      video.removeEventListener("play", rewindOnce);
      if (pristine && Math.abs(video.currentTime - posterTime) < 0.3) {
        video.currentTime = 0;
      }
      pristine = false;
    });

    // Wrap the video so we can overlay controls only on the frame.
    var player = document.createElement("div");
    player.className = "player";
    video.parentNode.insertBefore(player, video);
    player.appendChild(video);

    player.insertAdjacentHTML("beforeend",
      '<div class="vc">' +
        '<button class="vc-btn vc-play" type="button" aria-label="Play/Pause"></button>' +
        '<div class="vc-track" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
          '<div class="vc-buffered"></div>' +
          '<div class="vc-played"></div>' +
          '<div class="vc-thumb"></div>' +
        '</div>' +
        '<span class="vc-time">0:00</span>' +
        '<button class="vc-btn vc-fs" type="button" aria-label="Fullscreen"></button>' +
      '</div>'
    );

    var playBtn = player.querySelector(".vc-play");
    var fsBtn = player.querySelector(".vc-fs");
    var track = player.querySelector(".vc-track");
    var played = player.querySelector(".vc-played");
    var buffered = player.querySelector(".vc-buffered");
    var thumb = player.querySelector(".vc-thumb");
    var timeEl = player.querySelector(".vc-time");

    function syncPlay() {
      playBtn.innerHTML = video.paused ? ICON.play : ICON.pause;
      player.classList.toggle("is-paused", video.paused);
    }
    function syncFs() {
      var on = document.fullscreenElement === player;
      fsBtn.innerHTML = on ? ICON.exitFs : ICON.enterFs;
    }
    function syncProgress() {
      var d = video.duration;
      var t = pristine ? 0 : video.currentTime;
      var pct = d ? (t / d) * 100 : 0;
      played.style.width = pct + "%";
      thumb.style.left = pct + "%";
      track.setAttribute("aria-valuenow", Math.round(pct));
      var dur = isFinite(d) ? " / " + fmt(d) : "";
      timeEl.textContent = fmt(t) + dur;
    }
    function syncBuffered() {
      try {
        if (pristine) {
          buffered.style.width = "0%";
        } else if (video.buffered.length && video.duration) {
          var end = video.buffered.end(video.buffered.length - 1);
          buffered.style.width = (end / video.duration) * 100 + "%";
        }
      } catch (e) { /* ignore */ }
    }

    function toggle() {
      if (video.paused) {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        video.pause();
      }
    }

    playBtn.addEventListener("click", toggle);
    video.addEventListener("click", toggle);
    video.addEventListener("play", syncPlay);
    video.addEventListener("pause", syncPlay);
    video.addEventListener("timeupdate", syncProgress);
    video.addEventListener("loadedmetadata", syncProgress);
    video.addEventListener("progress", syncBuffered);

    fsBtn.addEventListener("click", function () {
      if (document.fullscreenElement === player) {
        document.exitFullscreen();
      } else if (player.requestFullscreen) {
        player.requestFullscreen();
      }
    });
    document.addEventListener("fullscreenchange", syncFs);

    // --- Scrubbing ---
    var scrubbing = false;
    function seekFromEvent(e) {
      var rect = track.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      var ratio = Math.min(1, Math.max(0, x / rect.width));
      if (video.duration) {
        pristine = false;
        video.currentTime = ratio * video.duration;
        syncProgress();
      }
    }
    function startScrub(e) {
      scrubbing = true;
      player.classList.add("is-scrubbing");
      seekFromEvent(e);
      e.preventDefault();
    }
    function moveScrub(e) { if (scrubbing) seekFromEvent(e); }
    function endScrub() {
      if (scrubbing) { scrubbing = false; player.classList.remove("is-scrubbing"); }
    }
    track.addEventListener("mousedown", startScrub);
    document.addEventListener("mousemove", moveScrub);
    document.addEventListener("mouseup", endScrub);
    track.addEventListener("touchstart", startScrub, { passive: false });
    track.addEventListener("touchmove", function (e) { moveScrub(e); e.preventDefault(); }, { passive: false });
    track.addEventListener("touchend", endScrub);

    // Keyboard seeking on the focused track.
    track.addEventListener("keydown", function (e) {
      if (!video.duration) return;
      if (e.key === "ArrowLeft") { pristine = false; video.currentTime = Math.max(0, video.currentTime - 5); e.preventDefault(); }
      else if (e.key === "ArrowRight") { pristine = false; video.currentTime = Math.min(video.duration, video.currentTime + 5); e.preventDefault(); }
      else if (e.key === " " || e.key === "Enter") { toggle(); e.preventDefault(); }
    });

    syncPlay();
    syncFs();
    syncProgress();
    syncBuffered();
  }

  function init() {
    var videos = document.querySelectorAll(".media video");
    for (var i = 0; i < videos.length; i++) enhance(videos[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
