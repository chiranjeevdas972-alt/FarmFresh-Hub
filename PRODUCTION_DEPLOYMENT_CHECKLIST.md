# FarmFresh Hub — Master Pre-Deployment & Production Readiness Handbook

This document serves as the master production readiness handbook and audit registry for **FarmFresh Hub** following the comprehensive safety hardening and responsiveness optimization cycle.

---

## 📋 Table of Checklists

1. **Secure Ingress & Environmental Checklist**
2. **Firebase Rules & ABAC Validation Blueprint**
3. **Cloudflare CDN & Hosting Delivery Setup**
4. **Legal & SaaS Compliance Checklist**
5. **Pre-Flight Smoke Test Scenarios**

---

## 1. Secure Ingress & Environmental Checklist

Ensure your server-side environment variables and client pipeline compile under secure strict rules.

- [ ] **Environment Segregation Check**: Prevent hardcoded developer keys. Ensure no credentials are saved inside `vite.config.ts`.
- [ ] **Startup Validation**: System automatically runs `validateSecretsConfig()` on init. Make sure `VITE_FIREBASE_API_KEY` is populated on deployment.
- [ ] **Strict Ingress Verification**: Confirm that CORS configurations on supporting server webhooks deny wildcard origins and require certified headers.
- [ ] **XSS Sanitizer Guard**: Verify that all inputs run through the custom sanitizer utility before saving to document paths.

---

## 2. Firebase Rules & ABAC Validation Blueprint

Configure standard tenant partition security rules to prevent horizontal and vertical privilege escalation.

- [ ] **Default Deny Policy**: Match rule `match /{document=**} { allow read, write: if false; }` must lead the matches block.
- [ ] **Owner-Based Isolation**: Validate that the helper `isOwner(data)` checks standard resource tracking IDs (`ownerId`, `userId`, `uid`).
- [ ] **Document ID Range**: Ensure path keys match `.size() <= 128` checking constraints to prevent oversized buffer injections.
- [ ] **Auth Token Email Verification**: Verify that operations are guarded by `request.auth.token.email_verified == true` for real non-bypass sessions.

---

## 3. Cloudflare CDN & Hosting Delivery Setup

Steps to deploy the compiled Static SPA build folder (`/dist`) onto Cloudflare Pages safely.

- [ ] **Static Assets Upload**: Point Cloudflare build pipeline to run `npm run build` and output standard bundle files inside `/dist`.
- [ ] **Route Redirection Sync**: Ensure `/public/_redirects` contains `/* /index.html 200` to correctly handle fallback routing on manual refreshes.
- [ ] **Security Headers Validation**: Inspect Cloudflare static header outputs to guarantee that `X-Frame-Options: DENY` and `Strict-Transport-Security` headers are successfully attached.
- [ ] **Optimization Pipeline**: Toggle "Automatic HTTPS Rewrites", "Brotli Compression", and "Rocket Loader" inside the Cloudflare Network settings panel.

---

## 4. Legal & SaaS Compliance Checklist

Ensure complete legal, auto-renewal, and compliance transparency to satisfy Stripe, Razorpay, CCPA, and App Store guidelines.

- [ ] **Static Compliance URLs**: Ensure `/privacy.html` and `/terms.html` are accessible and contain compliant terms for SaaS and data handling.
- [ ] **Disclosures Modal**: Complete explicit consent checkbox requirements must bind to payment operations before starting subscription trials.
- [ ] **Audit Trail logging**: Ensure failed authentications and rate limits are logged locally for administrative review under compliance terms.

---

## 5. Pre-Flight Smoke Test Scenarios

The operational sanity scenarios to run on staging/production before formal release:

1. **Rate Limiting Check**: Attempt to sign up or input incorrect OTP parameters 6 times rapidly. The interface must show the strict cooldown gate.
2. **XSS Input Check**: Enter structural code strings `"<script>alert(1)</script>"` inside farm batch labels. Verify that the saved text strips out tag nodes safely.
3. **Responsive Flow Check**: Load the application on iOS Safe Area simulators and desktop screens. Verify menus are accessible and layout doesn't break.
