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
  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
  var ICON_VOL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>';
  var ICON_MUTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l5 4V6L7 10H3zm12.7.1 1.4 1.4-2 2 2 2-1.4 1.4-2-2-2 2-1.4-1.4 2-2-2-2 1.4-1.4 2 2 2-2z"/></svg>';

  function clock(t) {
    if (!isFinite(t) || t < 0) return "0:00";
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ":" + (s < 10 ? "0" + s : s);
  }

  function isFs() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  document.querySelectorAll(".player").forEach(function (player) {
    var v = player.querySelector("video");
    if (!v) return;
    var big = player.querySelector(".pl-big");
    var play = player.querySelector(".pl-play");
    var seek = player.querySelector(".pl-seek");
    var time = player.querySelector(".pl-time");
    var mute = player.querySelector(".pl-mute");
    var fill = player.querySelector(".pl-fill");
    var fs = player.querySelector(".pl-fs");
    var note = player.querySelector(".pl-error");
    var stuck = false, stuckTimer = null;

    function paint() {
      var playing = !v.paused && !v.ended && v.readyState > 2;
      player.classList.toggle("playing", playing);
      player.classList.toggle("paused", !playing);
      if (play) {
        play.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
        play.setAttribute("aria-label", playing ? "Pause" : "Play");
      }
      if (mute) {
        mute.innerHTML = (v.muted || v.volume === 0) ? ICON_MUTE : ICON_VOL;
        mute.setAttribute("aria-label", v.muted ? "Unmute" : "Mute");
      }
      if (time) time.textContent = clock(v.currentTime) + " / " + clock(v.duration);
      if (seek && v.duration) seek.value = Math.round((v.currentTime / v.duration) * 1000);
      if (note) note.hidden = !(v.error || stuck);
    }

    function start() {
      var p = v.play();
      if (p && p.catch) {
        p.catch(function () {
          // some phones refuse to start with sound; try silent, then let them unmute
          v.muted = true;
          paint();
          var q = v.play();
          if (q && q.catch) q.catch(function () { player.classList.remove("buffering"); });
        });
      }
    }

    function toggle() {
      if (v.paused || v.ended) start(); else v.pause();
    }

    [big, play, v].forEach(function (el) { if (el) el.addEventListener("click", toggle); });

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
    ["playing", "canplay", "seeked", "pause", "ended"].forEach(function (ev) {
      v.addEventListener(ev, endBuffer);
    });

    if (seek) seek.addEventListener("input", function () {
      if (v.duration) v.currentTime = (seek.value / 1000) * v.duration;
    });

    if (mute) mute.addEventListener("click", function () { v.muted = !v.muted; });

    // fill: outside fullscreen it takes you full screen and crops to fill it;
    // inside fullscreen it switches between the whole frame and a filled screen
    if (fill) fill.addEventListener("click", function () {
      if (!isFs()) {
        player.classList.add("filling");
        fill.classList.add("on");
        enterFullscreen();
      } else {
        var on = player.classList.toggle("filling");
        fill.classList.toggle("on", on);
      }
      fill.setAttribute("aria-pressed", "false");
    });

    function enterFullscreen() {
      if (player.requestFullscreen) {
        player.requestFullscreen().catch(function () {
          if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
        });
      } else if (player.webkitRequestFullscreen) {
        player.webkitRequestFullscreen();
      } else if (v.webkitEnterFullscreen) {
        v.webkitEnterFullscreen();          // iPhone: the video goes full screen itself
      }
    }

    if (fs) fs.addEventListener("click", function () {
      if (isFs()) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        player.classList.remove("filling");
        if (fill) fill.classList.remove("on");
      } else {
        player.classList.remove("filling");
        if (fill) fill.classList.remove("on");
        enterFullscreen();
      }
    });

    player.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT") return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); }
      if (e.key === "m") { e.preventDefault(); v.muted = !v.muted; }
      if (e.key === "f") { e.preventDefault(); if (fs) fs.click(); }
    });

    paint();
  });
})();
