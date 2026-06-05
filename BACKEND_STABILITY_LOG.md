# Backend Stability Log

Date: 2026-06-04

Stable tag: `stable-coloring-login-create-2026-06-04`

Stable commit after Stripe repair: `6fe4099`

Brand/domain note added: 2026-06-05

Locked backend areas:

- Firebase email/password login
- Google login
- Google OAuth client ID and JavaScript origins for `https://www.colorprintables.online`
- Firebase authorized domains for `www.colorprintables.online`
- Vercel redirect behavior from `colorprintables.online` to `www.colorprintables.online`
- admin entitlement for `mosegaard622@gmail.com`
- anonymous and signed-in generation limits
- coloring page and paint-by-numbers generation authorization
- PDF export authorization
- Stripe checkout, success handling, and webhook fulfillment
- service worker route caching rules for auth/create/pricing/account/dashboard

Do not change these backend flows unless the user explicitly asks for backend auth, domain, entitlement, generation-limit, export-limit, or Stripe payment behavior to change.

Frontend prompt controls and image rendering fixes may still be changed when requested, but they should not alter auth, payment, entitlement, or limit behavior.
