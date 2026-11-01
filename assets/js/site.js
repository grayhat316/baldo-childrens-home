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




