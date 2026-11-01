# Fr. Baldo Children's Home, website

Website for Fr. Baldo Children's Home, Ndaragwa, Nyandarua County, Kenya.
Plain HTML, CSS and one small JS file. No build step, no framework, no server code, no database.

## Run it locally

```
python -m http.server 8123 --directory .
```

Then open http://127.0.0.1:8123/

## Deploy on Render

1. Push this repo to GitHub (already done).
2. Render dashboard, New, Static Site.
3. Connect the repo, branch main.
4. Build command: leave empty. Publish directory: `.`
5. Create. The URL looks like `https://baldo-home-demo.onrender.com`.

Every push to main redeploys. No environment variables are needed.

## Turning donations on for real

`assets/js/site.js`, first line:

```js
var paystackKey = "";
```

Put the home's **Paystack public key** in there. With a key present the donate form opens
Paystack's checkout, restricted to `card` or `mobile_money` depending on what the donor picked.
With it empty the form validates, then goes to `thank-you.html` without contacting Paystack.
Do not launch without a key: an empty key means no payment is taken.

Before that can happen:

- The home needs a Paystack (or Flutterwave) account under the CBO's own name. KYC needs the
  CBO certificate, a bank account and the signatory's ID.
- Paystack must approve mobile money (M-Pesa) for the account, otherwise only cards work.
- Test with Paystack test keys first, then swap to live keys.

Stripe was considered and rejected: it does not support M-Pesa at all.

## What still has to come from the home

1. Today's number of children. Sources disagree (130, ~100, 161, ~80). The site says "around a
   hundred" until the manager confirms.
2. The CBO registration number, and permission to publish it.
3. Written consent for photographs, and ideally the home's own photos to replace these.
4. A decision on whether they want a site, and who keeps it updated.
5. The real budget figures, if they want the money page to carry them.
6. M-Pesa paybill or till number, if they would rather donors pay straight to the home than
   through a card processor.

## Photographs

The three photographs and the video still come from Esharelife Foundation's page about the home,
and are credited on every page they appear. They show identifiable children. That is why this
repo is private, every page carries `noindex`, and `robots.txt` disallows everything. Do not make
it public and do not let search engines index it until the home gives written consent.

## Pages

Main: `index`, `our-story`, `the-children`, `life-at-the-home`, `education`, `outreach`,
`donate`, `where-your-money-goes`, `partners`, `get-involved`, `contact`

Support: `privacy`, `cookies`, `terms`, `donations-policy`, `safeguarding`, `accountability`,
`faq`, `accessibility`, `thank-you`, `donation-failed`, `404`

`FACTS.md` holds every fact used in the copy, with its source. Copy that is not in there does not
belong on the site.

## Security

There is no PHP, no SQL, no upload endpoint, no login and no admin panel. Card data goes to the
payment provider's hosted checkout and never touches this site. The only client side code is
amount selection, the receipt summary, and loading the video on click.
