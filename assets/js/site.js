// Payment configuration.
// paystackKey: the PUBLIC key of whichever account should receive the money.
// forceCurrency: set to "KES" if that account only settles in shillings; leave "" to offer both.
var paystackKey = "pk_test_5779ebb41162e2d6fba3077de7e6503cd5f56e54";
var forceCurrency = "KES";

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

// if the receiving account settles in one currency only, remove the others
if (forceCurrency && currencySelect) {
  Array.prototype.slice.call(currencySelect.options).forEach(function (o) {
    if (o.value !== forceCurrency) currencySelect.removeChild(o);
  });
  currencySelect.value = forceCurrency;
  currencySelect.setAttribute("aria-label", "Currency, fixed at " + forceCurrency);
}

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

if (currencySelect) {
  currencySelect.addEventListener("change", paintAmounts);
  paintAmounts();
}

amountButtons.forEach(function (b) {
  b.addEventListener("click", function () {
    amountButtons.forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
    b.setAttribute("aria-pressed", "true");
    var cur = currencySelect.value;
    amountInput.value = cur === "KES" ? b.dataset.kes : b.dataset.usd;
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

    if (!paystackKey) {
      location.href = "thank-you.html?amount=" + amount + "&currency=" + currency +
        "&method=" + method + "&email=" + encodeURIComponent(email);
      return;
    }

    var script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = function () {
      var handler = PaystackPop.setup({
        key: paystackKey,
        email: email,
        amount: Math.round(amount * 100),
        currency: currency,
        channels: method === "mpesa" ? ["mobile_money"] : ["card"],
        callback: function (res) {
          location.href = "thank-you.html?ref=" + encodeURIComponent(res.reference) +
            "&amount=" + amount + "&currency=" + currency + "&method=" + method;
        },
        onClose: function () {}
      });
      handler.openIframe();
    };
    document.body.appendChild(script);
  });
}


// The film. YouTube refuses an embed whose referrer is a private address
// (localhost, 127.0.0.1, 10.x, 192.168.x), so on those hosts we send the
// visitor to YouTube instead of showing a dead player.
var poster = document.querySelector(".video-poster");
if (poster) {
  poster.addEventListener("click", function (e) {
    var host = location.hostname;
    var isPrivate = host === "localhost" || host === "" ||
      /^127\./.test(host) || /^10\./.test(host) ||
      /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    if (isPrivate) return; // let the link open YouTube in a new tab
    e.preventDefault();
    var frame = document.createElement("iframe");
    frame.src = "https://www.youtube-nocookie.com/embed/" + poster.dataset.video + "?rel=0&autoplay=1";
    frame.title = "Film about the home, recorded in 2015";
    frame.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture";
    frame.allowFullscreen = true;
    poster.parentNode.replaceChild(frame, poster);
  });
}
