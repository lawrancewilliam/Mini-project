# 🛡️ SecureGuard — Project Summary

## What is this project?

**SecureGuard** is an AI-assisted **Sensitive Data Leakage Detection** web application. It allows developers to upload their codebase (as a ZIP file), scan it for hardcoded secrets, API keys, credentials, and PII data, and then uses a multi-layered AI engine to classify findings as real leaks vs. false positives.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | SvelteKit 2 (with Svelte 5 runes) |
| **Styling** | Tailwind CSS v4 |
| **ZIP Parsing** | JSZip |
| **PDF Generation** | jsPDF + html2canvas |
| **Local AI** | Ollama (llama3.2) via HTTP API |
| **State Management** | Svelte `$state` / `$effect` (rune-based) |
| **Storage** | `localStorage` (browser-side, no backend DB) |
| **Build Tool** | Vite 8 |

> **No external database** is used. All scan data, user sessions, and history are stored in the browser's `localStorage`.

---

## 📁 Project Structure

```
src/
├── lib/
│   ├── ai-engine.js         # Rule-based AI analysis engine (6 signal types)
│   ├── state.svelte.js      # Global app state, scan logic, auth, RULES list
│   └── index.js             # Re-exports
│
└── routes/
    ├── +page.svelte         # Landing page (SecureGuard marketing site)
    ├── +layout.svelte       # Root layout
    ├── layout.css           # Global styles
    │
    ├── login/               # Login page
    ├── register/            # Register page
    │
    ├── api/
    │   └── analyze/
    │       └── +server.js   # SvelteKit API route → calls Ollama LLM
    │
    └── dashboard/
        ├── +layout.svelte   # Dashboard sidebar layout (auth guard)
        ├── +page.svelte     # Dashboard home (summary cards, stats)
        ├── upload/          # File upload + scan configuration
        ├── scanning/        # Live scan progress page
        ├── results/         # Findings table with filters
        ├── ai-analysis/     # Per-finding AI signal breakdown
        ├── risk-assessment/ # Risk score visualization
        ├── recommendations/ # Remediation guidelines per finding
        ├── reports/         # PDF report generation
        ├── history/         # Past scans archive
        └── profile/         # User profile editor
```

---

## 🔑 Secret Detection Rules (13 total)

The scanner uses regex-based rules defined in `state.svelte.js`:

| Rule | Severity | Weight |
|------|----------|--------|
| AWS Client Access Key | Critical | 10 |
| OpenAI API Key | Critical | 10 |
| GitHub OAuth Token | Critical | 10 |
| SSH/RSA Private Key | Critical | 10 |
| Slack Webhook URL | Critical | 10 |
| Database Password | Critical | 9 |
| Google API Key | Medium | 8 |
| PAN Card Number | High | 8 |
| Aadhaar Card Number | High | 8 |
| Credit Card Number | High | 8 |
| JWT Secret Key | High | 8 |
| Email Address PII | Low | 3 |
| Phone Number PII | Low | 3 |

> Rules with **weight ≥ 8** trigger **Ollama LLM analysis**. Lower-weight rules use the rule-based engine only.

---

## 🤖 AI Engine Architecture (2 Layers)

### Layer 1 — Rule-Based Engine (`ai-engine.js`)
Runs 6 weighted signals to compute a confidence score:

| Signal | Weight | What it checks |
|--------|--------|----------------|
| **Variable Naming** | 1.0 | Patterns like `password=`, `AWS_KEY`, `prod_` |
| **Value Entropy** | 1.0 | Shannon entropy of the matched value |
| **Comment Context** | 0.8 | Nearby comments (TODO, mock, sensitive) |
| **File Context** | 0.7 | File path (test/, config/, src/) |
| **Code Structure** | 0.6 | Inside test block? console.log nearby? |
| **Assignment Pattern** | 0.5 | Hardcoded vs env-loaded vs fallback |

**Verdict thresholds:**
- ≥ 80% → `Leak Confirmed` 🔴
- 55–79% → `Suspicious` 🟡
- 30–54% → `Test Data` 🟢
- < 30% → `False Positive` ⚪

### Layer 2 — Ollama LLM (`/api/analyze` + `llama3.2`)
- Called for **high-weight rules** only (weight ≥ 8)
- Sends surrounding code context (10 lines before/after) to local Ollama
- 15-second timeout, gracefully falls back to Layer 1 if unavailable
- Model: `llama3.2` at `http://127.0.0.1:11434`
- Temperature: `0.1` (deterministic, low creativity)

---

## 👤 Authentication System

**Supabase Authentication** backed by `public.profiles` with row-level security.

| Account | Email | Role |
|---------|-------|------|
| Admin (created in Supabase Dashboard) | `admin@gmail.com` | Admin |
| Developer (via register) | (signup email) | Developer |

- New registrations are always **Developer** — the role is database-assigned via `public.profiles.role` and never accepted from the registration form.
- The initial Admin is provisioned in the **Supabase Dashboard → Authentication → Users**, then promoted to Admin by an admin/SQL run:
  `UPDATE public.profiles SET role = 'Admin' WHERE email = 'admin@gmail.com';`
- Passwords are managed entirely by Supabase Auth and are never stored in source code.
- Dashboard is **auth-guarded** via `$effect` reactive check + role-based route guard; admin-only routes redirect Developers to `/dashboard`.

---

## 🔄 Scan Workflow (Step by Step)

```
User uploads ZIP
        ↓
Extract files (ignore node_modules, .git, dist, etc.)
        ↓
Filter supported file types (.py, .js, .ts, .java, .env, etc.)
        ↓
For each file → For each line → Match against 13 RULES (regex)
        ↓
For each match:
  - If rule.weight >= 8 → call Ollama (with 15s timeout)
  - Else → use rule-based AI engine
        ↓
Compute severity, risk weight, counts (Critical/High/Medium/Low)
        ↓
Calculate final Risk Score (capped at 100)
        ↓
Save scan to localStorage → Navigate to Results
```

> If no file is uploaded (or sandbox demo ZIP used), a **simulated scan** runs with mock findings.

---

## 📊 Dashboard Pages

| Page | Purpose |
|------|---------|
| **Dashboard Home** | Summary stats: secrets found, risk score, severity breakdown |
| **Upload** | ZIP file upload + project name/description + scan options |
| **Scanning** | Live animated progress bar + step-by-step status |
| **Results** | Full findings table with filter by severity/status |
| **AI Analysis** | Signal-by-signal breakdown for each finding |
| **Risk Assessment** | Visual risk score + severity distribution charts |
| **Recommendations** | Per-finding fix + best practice guidance |
| **Reports** | PDF export using jsPDF + html2canvas |
| **History** | All past scans list with delete option |
| **Profile** | Edit display name + avatar URL |

---

## 🌐 Landing Page

A polished marketing site at `/` with:
- Sticky navigation with smooth scroll
- Hero section with animated badge + tagline
- Stats bar (2.4M repos, 150+ formats, 99.2% accuracy, <15s scan)
- Feature cards (6 features)
- Workflow steps (5-step pipeline)
- About section with mission statement
- CTA section with login/register buttons
- Footer with policy links

---

## 💾 Data Persistence

All data lives in **browser localStorage** — no server database:

| Key | Content |
|-----|---------|
| `SecureGuard_user` | Current logged-in user object |
| `SecureGuard_scans` | Array of all scan results + findings |
| `SecureGuard_selected_scan` | Currently selected scan ID |

---

## ✅ What's Complete

- [x] Landing/marketing page (fully styled)
- [x] Login & Register pages
- [x] Dashboard with sidebar navigation
- [x] ZIP file upload & real scanning engine
- [x] 13-rule regex secret detection engine
- [x] 6-signal rule-based AI context analysis
- [x] Ollama LLM integration (optional, with fallback)
- [x] Simulated scan mode (demo/sandbox)
- [x] All 9 dashboard sub-pages (results, AI analysis, risk, recommendations, reports, history, profile)
- [x] PDF report export
- [x] localStorage persistence
- [x] Auth guard on dashboard routes
- [x] Mobile-responsive sidebar

## ⏳ What's Missing / Could Be Added

- [ ] Real backend database (Supabase / SQLite / PostgreSQL)
- [ ] Real user registration with password hashing
- [ ] GitHub/GitLab repo URL scanning (instead of ZIP only)
- [ ] Multi-user support with data isolation
- [ ] Webhook/CI integration (pre-commit hooks)
- [ ] Real-time Ollama model selector in UI
- [ ] Email notifications for critical leaks


