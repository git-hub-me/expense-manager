# Changelog

All notable changes to Expense Manager are documented here.

---

## [Unreleased] — 2026-03-07

### Added
- **Login screen** — username/password gate using environment variables (`VITE_APP_USERNAME` / `VITE_APP_PASSWORD`), with shake animation on failure
- **Brute-force lockout** — 5 failed attempts triggers a 5-minute lock with live MM:SS countdown; state persisted in localStorage
- **4-step onboarding walkthrough** — animated slides (welcome, AI entry demo, category grid, all-set) with progress dots and Back/Next navigation; shown once to new users only
- **Sample data seeding** — seeded automatically when a new user completes onboarding; never runs if data already exists
- **Auth state persistence** — `expense_tracker_auth_v1` Capacitor Preferences key; returning users go straight to the app
- **Sign out** — accessible from the Settings modal; resets auth state and returns to Login
- **Error boundary** — wraps `<App />` in `main.jsx`; render crashes show a friendly "Something went wrong" card with a Reload button instead of a blank screen
- **Fetch timeout (AIEntry)** — `AbortController` with 15-second timeout on Gemini API call; shows "Request timed out" error if exceeded

### Changed
- `seedSampleData()` moved out of the startup `useEffect` and into `handleOnboardingComplete` so it only runs for new users
- Settings modal: added Sign Out section and version footer; made panel scrollable (`max-h-[88vh] overflow-y-auto`)

### Fixed
- `console.warn` in `reclassify.js` (batch skip message) now guarded by `import.meta.env.DEV` — no warnings leak into production builds

---

## [1.1.0] — 2026-02-15

### Added
- **AI ledger reclassification** — batch Gemini-powered re-categorisation with conservative / deep modes, diff-table review, and one-tap undo (30-second window)
- **Subcategories** — per-category subcategory taxonomy stored in `expense_tracker_subcategories_v1`
- **Audit log** — every reclassification event recorded in `expense_tracker_audit_v1` (last 100 entries)
- **Dashboard improvements** — bar chart clickable to filter History by date; spending summary cards

---

## [1.0.0] — 2026-01-20

### Added
- AI expense entry via Gemini API — type a natural-language description, review, and confirm
- Manual expense entry with 7 categories: Food, Transport, Utilities, Entertainment, Shopping, Health, Other
- Expense history with sort, filter, inline edit, and delete
- CSV export and import
- Capacitor 8 integration for native iOS storage (UserDefaults via `@capacitor/preferences`)
- Settings panel with AI model selector and connection test
