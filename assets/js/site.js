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
      location.href = "thank-you.html?amount=" + amount + "&currency=" + currency +
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
          location.href = "thank-you.html?ref=" + encodeURIComponent(res.reference) +
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




// The film. Loads the player into the page, watches for 15 seconds, and if the
// player has not come up by then it says so and keeps retrying in the background.
var vFrame = document.querySelector(".video-frame");
if (vFrame) {
  var vFallback = document.querySelector(".video-fallback");
  var vMsg = vFallback ? vFallback.querySelector(".msg") : null;
  var vPlayer = null, vTimer = null, vRetry = null, vApi = false, mounted = false;

  function vSay(text) {
    if (!vFallback) return;
    vFallback.hidden = false;
    if (vMsg && text) vMsg.textContent = text;
  }

  function vSchedule(text) {
    // pull the player back off so the poster and the notice show instead of a blank box
    var dead = vFrame.querySelector("#yt-host");
    if (dead) dead.parentNode.removeChild(dead);
    vSay(text);
    if (vRetry || !mounted) return;           // one retry loop at a time
    vRetry = setTimeout(function () {
      vRetry = null;
      try { if (vPlayer && vPlayer.destroy) vPlayer.destroy(); } catch (e) {}
      vPlayer = null;
      vMount();
    }, 9000);
  }

  function vMount() {
    var host = vFrame.querySelector("#yt-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "yt-host";
      vFrame.appendChild(host);
    } else {
      host.innerHTML = "";
    }
    vPlayer = new YT.Player(host, {
      videoId: vFrame.dataset.video,
      playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
      events: {
        onReady: function () {
          clearTimeout(vTimer);
          if (vFallback) vFallback.hidden = true;
        },
        onError: function () { vSchedule("The film did not load."); }
      }
    });
    clearTimeout(vTimer);
    vTimer = setTimeout(function () { vSchedule("The film is taking too long to load."); }, 15000);
  }

  function vStart() {
    mounted = true;
    if (window.YT && window.YT.Player) { vMount(); return; }
    window.onYouTubeIframeAPIReady = function () { vMount(); };
    if (!vApi) {
      vApi = true;
      var s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
    // if the API itself never arrives, say so rather than sit silent
    setTimeout(function () { if (mounted && !vPlayer) vSchedule("The film did not load."); }, 15000);
  }

  var posterBtn = vFrame.querySelector(".video-poster");
  posterBtn.addEventListener("click", vStart);
  var retryBtn = document.querySelector(".video-retry");
  if (retryBtn) retryBtn.addEventListener("click", function () {
    if (vRetry) { clearTimeout(vRetry); vRetry = null; }
    try { if (vPlayer && vPlayer.destroy) vPlayer.destroy(); } catch (e) {}
    vPlayer = null;
    vMount();
  });
}


// contact form: compose the message in the visitor's own mail app
var cForm = document.querySelector("#contact-form");
if (cForm) {
  cForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.querySelector("#c-name").value.trim();
    var email = document.querySelector("#c-email").value.trim();
    var subject = document.querySelector("#c-subject").value;
    var message = document.querySelector("#c-message").value.trim();
    var body = message + "\n\n" + name + "\n" + email;
    var url = "mailto:baldochildrenshome@gmail.com"
      + "?subject=" + encodeURIComponent(subject)
      + "&body=" + encodeURIComponent(body);
    window.location.href = url;
    var hint = document.querySelector("#contact-hint");
    if (hint) hint.textContent = "Your email app should have opened. If it did not, write to baldochildrenshome@gmail.com directly.";
  });
}
