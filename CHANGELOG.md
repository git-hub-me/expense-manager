# Changelog

All notable changes to Expense Manager are documented here.

---

## [1.3.0] — 2026-03-10

### Added
- **3 new categories: Travel, Investment, Rent** — each with a dedicated Lucide icon (`Plane`, `PiggyBank`, `Home`), color, background, and default subcategories; total categories now 10
- **Hardcoded CSV category map** — 23 known CSV values map precisely to an app category + subcategory (e.g. "Trip Travel" → Travel / Flights & Transport, "Grocery" → Food / Groceries); no Gemini call or modal needed
- **Yearly Trend chart** — Jan–Dec bar chart for the current year on Dashboard; current month shown in olive, future months grayed out; current month labeled MTD
- **Pie chart month selector** — "By Category" card now has a 3-way toggle: This month / Last month / Last week (previous Mon–Sun)
- **Time-based greeting** — Dashboard header shows Good morning / Good afternoon / Good evening / Good night based on local hour
- **MTD vs MTD category comparison** — Category Comparison now compares this month 1–N vs the same date range in the previous month (e.g. Mar 1–10 vs Feb 1–10) instead of vs full last month

### Changed
- **Category Comparison moved to bottom** of Dashboard to reduce scroll depth on first load
- **Onboarding category slide** now derives icons, colors, and count from `constants.js` — automatically reflects any future category additions
- **AIEntry Gemini prompt** now lists all 10 categories dynamically from `CATEGORIES` instead of a hardcoded 7-item string

---

## [1.2.0] — 2026-03-09

### Added
- **Mobile sort bar in History** — sort pills (Date / Amount / Category) with direction toggle, visible on mobile where table column headers aren't shown
- **Stop button during Reclassify analysis** — abort a running batch analysis mid-way; shows "Analysis stopped" toast and applies no changes
- **Save error display in PendingExpense** — if saving an expense fails, an error message now appears below the Save button instead of failing silently

### Fixed
- **AIEntry cancel aborts fetch** — closing the modal (X button, Cancel, or backdrop tap) during extraction now immediately aborts the in-flight Gemini network request
- **CSV import view refresh** — Dashboard and History now update instantly after import; previously a race condition could show stale data until the next navigation
- **CSV amount parsing** — amounts with commas (`1,234.56`), currency symbols (`₹1,200`), or accounting negatives (`(500.00)`) were being silently dropped or parsed incorrectly; all three formats now handled correctly
- **ReclassifyReview "Reject All" renamed to "Cancel"** — the button always dismissed the modal without applying anything, so "Reject All" was misleading

---

## [1.1.2] — 2026-03-07

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
