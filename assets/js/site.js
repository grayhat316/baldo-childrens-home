// Payment configuration.
// paystackKey: the PUBLIC key of whichever account should receive the money.
// settleCurrency: the currency that account is paid in. Paystack charges this.
// defaultCurrency: what a donor sees first.
var paystackKey = "pk_test_5779ebb41162e2d6fba3077de7e6503cd5f56e54";
var settleCurrency = "KES";
var defaultCurrency = "USD";
var fxRate = 129.9; // live rate replaces this on load

function money(n, currency) {
  return currency === "KES" ? "KSh " + n.toLocaleString() : "$" + n.toLocaleString();
}

// mobile menu
var toggle = document.querySelector(".nav-toggle");
var nav = document.querySelector(".nav");
if (toggle && nav) {
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

// amount picker
var currencySelect = document.querySelector("#currency");
var amountInput = document.querySelector("#amount");
var amountButtons = document.querySelectorAll(".amounts button");

function paintAmounts() {
  if (!currencySelect) return;
  var cur = currencySelect.value;
  amountButtons.forEach(function (b) {
    var v = cur === "KES" ? b.dataset.kes : b.dataset.usd;
    b.textContent = money(Number(v), cur);
    b.setAttribute("aria-pressed", "false");
  });
  if (amountInput) amountInput.value = "";
}

var fxNote = document.querySelector("#fx-note");

function paintNote() {
  if (!fxNote || !currencySelect) return;
  if (currencySelect.value === settleCurrency) {
    fxNote.textContent = "";
    return;
  }
  var amt = Number(amountInput && amountInput.value);
  var line = "Cards are charged in shillings at the day's rate, today 1 USD = " +
    fxRate.toFixed(2) + " KES.";
  if (amt) line = money(Math.round(amt * fxRate), settleCurrency) + " at today's rate. " + line;
  fxNote.textContent = line;
}

if (currencySelect) {
  currencySelect.value = defaultCurrency;
  currencySelect.addEventListener("change", function () { paintAmounts(); paintNote(); });
  paintAmounts();
  paintNote();
  if (amountInput) amountInput.addEventListener("input", paintNote);
  fetch("https://open.er-api.com/v6/latest/USD")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.rates && d.rates.KES) { fxRate = d.rates.KES; paintNote(); }
    })
    .catch(function () {});
}

amountButtons.forEach(function (b) {
  b.addEventListener("click", function () {
    amountButtons.forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
    b.setAttribute("aria-pressed", "true");
    var cur = currencySelect.value;
    amountInput.value = cur === "KES" ? b.dataset.kes : b.dataset.usd;
    if (typeof paintNote === "function") paintNote();
  });
});

// checkout
var donateForm = document.querySelector("#donate-form");
if (donateForm) {
  donateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var amount = Number(amountInput.value);
    var currency = currencySelect.value;
    var method = donateForm.querySelector("input[name=method]:checked").value;
    var email = document.querySelector("#email").value.trim();

    if (!amount || amount < 1) {
      amountInput.focus();
      return;
    }
    if (!email) {
      document.querySelector("#email").focus();
      return;
    }

    var chargeAmount = currency === settleCurrency ? amount : Math.round(amount * fxRate);

    if (!paystackKey) {
      location.href = "/thank-you?amount=" + amount + "&currency=" + currency +
        "&charged=" + chargeAmount + "&chargedcur=" + settleCurrency +
        "&method=" + method + "&email=" + encodeURIComponent(email);
      return;
    }

    var script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = function () {
      var handler = PaystackPop.setup({
        key: paystackKey,
        email: email,
        amount: chargeAmount * 100,
        currency: settleCurrency,
        channels: method === "mpesa" ? ["mobile_money"] : ["card"],
        callback: function (res) {
          location.href = "/thank-you?ref=" + encodeURIComponent(res.reference) +
            "&amount=" + amount + "&currency=" + currency +
            "&charged=" + chargeAmount + "&chargedcur=" + settleCurrency +
            "&method=" + method;
        },
        onClose: function () {}
      });
      handler.openIframe();
    };
    document.body.appendChild(script);
  });
}






// ---------- the film player ----------
(function () {
  var ICON_PLAY  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
  var ICON_VOL   = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>';
  var ICON_MUTE  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l5 4V6L7 10H3zm12.7.1 1.4 1.4-2 2 2 2-1.4 1.4-2-2-2 2-1.4-1.4 2-2-2-2 1.4-1.4 2 2 2-2z"/></svg>';
  var ICON_ENTER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3V5zm2 2v10h14V7H5z"/></svg>';
  var ICON_EXIT  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h2v6H5V7h4V3zm4 0h2v4h4v2h-6V3zM5 15h6v6H9v-4H5v-2zm10 0h4v2h-4v4h-2v-6z"/></svg>';

  function clock(t) {
    if (!isFinite(t) || t < 0) return "0:00";
    var m = Math.floor(t / 60), sec = Math.floor(t % 60);
    return m + ":" + (sec < 10 ? "0" + sec : sec);
  }

  function fullscreenEl() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  document.querySelectorAll(".player").forEach(function (player) {
    var v = player.querySelector("video");
    if (!v) return;
    var big = player.querySelector(".pl-big");
    var playBtn = player.querySelector(".pl-play");
    var timeEl = player.querySelector(".pl-time");
    var muteBtn = player.querySelector(".pl-mute");
    var fsBtn = player.querySelector(".pl-fs");
    var fillBtn = player.querySelector(".pl-fill");
    var closeBtn = player.querySelector(".pl-x");
    var prog = player.querySelector(".pl-progress");
    var played = player.querySelector(".pl-played");
    var knob = player.querySelector(".pl-knob");
    var flashL = player.querySelector(".pl-flash");
    var note = player.querySelector(".pl-error");
    var stuck = false, stuckTimer = null, hideTimer = null;

    function bigOpen() { return player.classList.contains("theatre") || !!fullscreenEl(); }

    function showControls() {
      player.classList.remove("ui-hidden");
      clearTimeout(hideTimer);
      if (!v.paused) {
        hideTimer = setTimeout(function () {
          if (!v.paused && bigOpen()) player.classList.add("ui-hidden");
        }, 3000);
      }
    }

    function paint() {
      var playing = !v.paused && !v.ended;
      player.classList.toggle("playing", playing);
      player.classList.toggle("paused", !playing);
      if (playBtn) { playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY; playBtn.setAttribute("aria-label", playing ? "Pause" : "Play"); }
      if (muteBtn) {
        muteBtn.innerHTML = (v.muted || v.volume === 0) ? ICON_MUTE : ICON_VOL;
        muteBtn.setAttribute("aria-label", v.muted ? "Unmute" : "Mute");
      }
      if (timeEl) timeEl.textContent = clock(v.currentTime) + " / " + clock(v.duration);

      var pct = v.duration ? (v.currentTime / v.duration) * 100 : 0;
      if (played) played.style.width = pct + "%";
      if (knob) knob.style.left = pct + "%";
      if (prog) {
        prog.setAttribute("aria-valuenow", Math.round(pct));
        prog.setAttribute("aria-valuetext", clock(v.currentTime));
      }
      if (fsBtn) {
        var open = bigOpen();
        fsBtn.innerHTML = open ? ICON_EXIT : ICON_ENTER;
        fsBtn.setAttribute("aria-label", open ? "Exit full screen" : "Full screen");
      }
      if (fillBtn) fillBtn.classList.toggle("on", player.classList.contains("filling"));
      if (note) note.hidden = !(v.error || stuck);
    }

    function start() {
      var pr = v.play();
      if (pr && pr.catch) pr.catch(function () {
        v.muted = true; paint();
        var again = v.play();
        if (again && again.catch) again.catch(function () { player.classList.remove("buffering"); });
      });
      showControls();
    }

    function toggle() { if (v.paused || v.ended) start(); else { v.pause(); showControls(); } }

    function seekBy(sec) {
      if (!v.duration) return;
      v.currentTime = Math.min(Math.max(0, v.currentTime + sec), v.duration - 0.2);
      paint();
    }

    function flash(side, text) {
      if (!flashL) return;
      flashL.className = "pl-flash " + side + " show";
      flashL.textContent = text;
      setTimeout(function () { flashL.classList.remove("show"); }, 700);
    }

    function lockLandscape() {
      try {
        if (screen.orientation && screen.orientation.lock) {
          var r = screen.orientation.lock("landscape");
          if (r && r.catch) r.catch(function () {});
        } else if (screen.lockOrientation) {
          screen.lockOrientation("landscape");
        }
      } catch (e) {}
    }

    function unlockRotation() {
      try {
        if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
      } catch (e) {}
    }

    function openStage(filled) {
      player.classList.add("theatre");
      player.classList.toggle("filling", !!filled);
      document.documentElement.classList.add("theatre-open");
      player.classList.remove("ui-hidden");
      if (player.requestFullscreen) {
        var r = player.requestFullscreen();
        if (r && r.catch) r.catch(function () {});
      }
      showControls();
      paint();
    }

    function closeStage() {
      try { if (fullscreenEl() && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
      player.classList.remove("theatre");
      player.classList.remove("filling");
      player.classList.remove("ui-hidden");
      document.documentElement.classList.remove("theatre-open");
      unlockRotation();
      paint();
    }

    // taps: single toggles playback, double on a side jumps ten seconds
    var lastTap = 0, tapTimer = null;
    v.addEventListener("click", function (e) {
      var now = Date.now();
      var box = v.getBoundingClientRect();
      var where = (e.clientX - box.left) / box.width;

      if (now - lastTap < 320) {
        clearTimeout(tapTimer);
        lastTap = 0;
        if (where < 0.35) { seekBy(-10); flash("left", "-10 seconds"); }
        else if (where > 0.65) { seekBy(10); flash("right", "+10 seconds"); }
        return;
      }
      lastTap = now;
      tapTimer = setTimeout(function () { toggle(); showControls(); }, 240);
    });

    if (big) big.addEventListener("click", function (e) { e.stopPropagation(); start(); });
    if (playBtn) playBtn.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
    if (muteBtn) muteBtn.addEventListener("click", function () { v.muted = !v.muted; });

    if (fsBtn) fsBtn.addEventListener("click", function () {
      if (bigOpen()) closeStage();
      else { openStage(false); }
    });

    if (fillBtn) fillBtn.addEventListener("click", function () {
      if (!bigOpen()) { openStage(true); lockLandscape(); }
      else {
        var on = player.classList.toggle("filling");
        if (on) lockLandscape();
      }
      paint();
    });

    if (closeBtn) closeBtn.addEventListener("click", closeStage);

    // dragging the progress bar
    var dragging = false;
    function seekFromEvent(e) {
      var box = prog.getBoundingClientRect();
      var ratio = Math.min(Math.max((e.clientX - box.left) / box.width, 0), 1);
      if (v.duration) v.currentTime = ratio * v.duration;
      paint();
    }
    if (prog) {
      prog.addEventListener("pointerdown", function (e) {
        dragging = true;
        prog.setPointerCapture(e.pointerId);
        seekFromEvent(e);
      });
      prog.addEventListener("pointermove", function (e) { if (dragging) seekFromEvent(e); });
      prog.addEventListener("pointerup", function (e) {
        dragging = false;
        try { prog.releasePointerCapture(e.pointerId); } catch (err) {}
      });
      prog.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); seekBy(5); }
        if (e.key === "ArrowLeft") { e.preventDefault(); seekBy(-5); }
      });
    }

    ["play", "pause", "ended", "timeupdate", "loadedmetadata", "volumechange", "canplay", "error"]
      .forEach(function (ev) { v.addEventListener(ev, paint); });

    function beginBuffer() {
      player.classList.add("buffering");
      clearTimeout(stuckTimer);
      stuckTimer = setTimeout(function () {
        if (player.classList.contains("buffering")) { stuck = true; paint(); }
      }, 15000);
    }
    function endBuffer() {
      player.classList.remove("buffering");
      clearTimeout(stuckTimer);
      stuck = false;
      paint();
    }
    v.addEventListener("waiting", beginBuffer);
    v.addEventListener("stalled", beginBuffer);
    v.addEventListener("seeking", beginBuffer);
    ["playing", "canplay", "seeked", "pause", "ended"].forEach(function (ev) { v.addEventListener(ev, endBuffer); });

    document.addEventListener("fullscreenchange", paint);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && bigOpen()) closeStage();
    });

    player.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT") return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); }
      if (e.key === "m") { e.preventDefault(); v.muted = !v.muted; }
      if (e.key === "f") { e.preventDefault(); if (fsBtn) fsBtn.click(); }
      if (e.key === "ArrowRight") { e.preventDefault(); seekBy(10); }
      if (e.key === "ArrowLeft") { e.preventDefault(); seekBy(-10); }
    });

    paint();
  });
})();

// contact form: lay the message out, then send it by WhatsApp or email
var cForm = document.querySelector("#contact-form");
if (cForm) {
  var review = document.querySelector("#contact-review");

  cForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.querySelector("#c-name").value.trim();
    var email = document.querySelector("#c-email").value.trim();
    var subject = document.querySelector("#c-subject").value;
    var message = document.querySelector("#c-message").value.trim();

    document.querySelector("#rv-name").textContent = name;
    document.querySelector("#rv-email").textContent = email;
    document.querySelector("#rv-subject").textContent = subject;
    document.querySelector("#rv-message").textContent = message;

    var text = subject + "\n\n" + message + "\n\n" + name + "\n" + email;
    document.querySelector("#rv-whatsapp").href =
      "https://wa.me/254710238132?text=" + encodeURIComponent(text);
    document.querySelector("#rv-email").href =
      "mailto:baldochildrenshome@gmail.com?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(message + "\n\n" + name + "\n" + email);

    review.hidden = false;
    review.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  var edit = document.querySelector("#rv-edit");
  if (edit) edit.addEventListener("click", function () {
    review.hidden = true;
    document.querySelector("#c-name").focus();
  });
}
