# FarmFresh Hub - Production & Deployment Guide

Welcome to the production deployment guide for FarmFresh Hub. This document details the architectural configuration, environmental requirements, and continuous integration commands needed to set up and deploy FarmFresh Hub in a security-hardened production environment.

---

## 🚀 Deployment Guide

### 1. GitHub Integration & Repository Setup
Follow these steps to initialize your repository and configure automated pipeline triggers:
```bash
# Initialize git repository
git init

# Add remote location
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git

# Stage and commit production-ready base codebase
git add .
git commit -m "chore: setup production-ready SaaS environment"

# Push to primary branch (usually 'main' or 'master')
git branch -M main
git push -u origin main
```

---

### 2. Cloudflare Pages Deployment (Frontend)
Cloudflare Pages seamlessly integrates with GitHub for zero-downtime React/Vite builds:
1. **Login to Cloudflare Dashboard**: Navigate to **Workers & Pages** -> **Create an Application** -> **Pages** -> **Connect to Git**.
2. **Authorize Repository**: Select your `YOUR_REPO_NAME` repository.
3. **Configure Build Settings**:
   - **Framework Preset**: `Vite` (or custom if automatically detected)
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
4. **Configure Environment Variables**: Add the following configurations inside CLoudflare project settings -> **Environment Variables**:
   - `VITE_EMAILJS_SERVICE_ID`
   - `VITE_EMAILJS_TEMPLATE_ID`
   - `VITE_EMAILJS_PUBLIC_KEY`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. **Route Redirection**: The application contains a `public/_redirects` file that automatically configures Cloudflare Pages' router to gracefully route single-page application indices (fallback to `index.html` with a 200 response).

---

### 3. Firebase Suite Deployment (Authentication, Firestore, Storage, & Cloud Functions)
Make sure you have installed the Firebase CLI tool locally (`npm install -g firebase-tools`):
```bash
# Authenticate CLI
firebase login

# Bind local setup to your cloud project
firebase use --add YOUR_FIREBASE_PROJECT_ID

# Deploy security rules and indexes synchronously
firebase deploy --only firestore:rules,firestore:indexes,storage

# Navigate to the backend functions folder and install node dependencies
cd functions
npm install

# Compile TypeScript functions to CommonJS files
npm run build

# Deploy Cloud Functions to production
firebase deploy --only functions
```

---

## 🐳 Environment Secrets & Parameters
Save your secrets on secure servers or in GitHub Action Secrets. Never check in concrete credential files to public branches.
Use the structure specified inside `.env.example`:

| Environment Variable | Intent / Usage |
|---|---|
| `VITE_EMAILJS_SERVICE_ID` | Service ID for landing page and partner requests |
| `VITE_EMAILJS_TEMPLATE_ID` | EmailJS template map |
| `VITE_EMAILJS_PUBLIC_KEY` | Public access key for browser client submissions |
| `VITE_FIREBASE_API_KEY` | Production authentication key for Firebase API endpoints |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain |
| `VITE_FIREBASE_PROJECT_ID` | Firestore core target project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Reference storage bucket for uploading files |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Browser verification and notifications sender |
| `VITE_FIREBASE_APP_ID` | Firebase identity ID for current bundle |

---

## 🔒 Production-Grade Security Hardening
This setup contains several security layers:
- **Relational Integrity Rules**: Firestore rules require users to be verified (`email_verified == true` or authenticated Google user) to execute write scopes.
- **Master-Gate Patterns**: Multi-tier updates validate keys using strict constraint matching (`keys().hasAll(...) && keys().size() == N`) and affected key limits via `.affectedKeys().hasOnly(...)`.
- **Atomic Operations Protection**: Key-based writes must conform to strict payload boundaries, preventing resource poisoning and data spoofing.
- **Client Fallbacks**: The code supports dynamic loaded environments alongside structured `.json` configuration targets for high-reliability development and production isolation.
