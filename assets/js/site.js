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

  var ICON_ENTER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3V5zm2 2v10h14V7H5z"/></svg>';
  var ICON_EXIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h2v6H5V7h4V3zm4 0h2v4h4v2h-6V3zM5 15h6v6H9v-4H5v-2zm10 0h4v2h-4v4h-2v-6z"/></svg>';

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
      if (fs) {
        var big = player.classList.contains("theatre") || !!isFs();
        fs.innerHTML = big ? ICON_EXIT : ICON_ENTER;
        fs.setAttribute("aria-label", big ? "Exit the big screen" : "Full screen");
      }
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

    if (big) big.addEventListener("click", toggle);
    if (play) play.addEventListener("click", toggle);

    v.addEventListener("click", function () {
      var onStage = player.classList.contains("theatre") || !!isFs();
      if (!onStage) { toggle(); return; }
      var hidden = player.classList.toggle("ui-hidden");
      clearTimeout(player._uiTimer);
      if (!hidden) {
        player._uiTimer = setTimeout(function () {
          if (!v.paused) player.classList.add("ui-hidden");
        }, 3000);
      }
    });

    player.addEventListener("mousemove", function () {
      if (!player.classList.contains("theatre")) return;
      player.classList.remove("ui-hidden");
      clearTimeout(player._uiTimer);
      player._uiTimer = setTimeout(function () {
        if (!v.paused) player.classList.add("ui-hidden");
      }, 3000);
    });

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

    function openBig() {
      player.classList.add("theatre");
      player.classList.remove("ui-hidden");
      document.documentElement.classList.add("theatre-open");
      // ask the browser for real fullscreen too, but never depend on it
      if (player.requestFullscreen) {
        var r = player.requestFullscreen();
        if (r && r.catch) r.catch(function () {});
      }
    }

    function closeBig() {
      player.classList.remove("theatre");
      player.classList.remove("filling");
      player.classList.remove("ui-hidden");
      document.documentElement.classList.remove("theatre-open");
      if (fill) fill.classList.remove("on");
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    }

    function bigOpen() {
      return player.classList.contains("theatre") || !!isFs();
    }

    if (fill) fill.addEventListener("click", function () {
      if (!bigOpen()) {
        player.classList.add("filling");
        if (fill) fill.classList.add("on");
        openBig();
      } else {
        var on = player.classList.toggle("filling");
        if (fill) fill.classList.toggle("on", on);
      }
    });

    if (fs) fs.addEventListener("click", function () {
      if (bigOpen()) closeBig(); else openBig();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && bigOpen()) closeBig();
    });

    player.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT") return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); }
      if (e.key === "m") { e.preventDefault(); v.muted = !v.muted; }
      if (e.key === "f") { e.preventDefault(); if (fs) fs.click(); }
      if (e.key === "Escape") { if (bigOpen()) closeBig(); }
    });

    paint();
  });
})();
