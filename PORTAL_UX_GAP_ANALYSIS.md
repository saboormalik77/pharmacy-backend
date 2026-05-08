# Pharmacy Portal — UX Gap Analysis & Task List

**Purpose of this document**
This is a **pure UX** (not UI, not code) comparison between:

- **Reference ("new portal")** — the static HTML set under `new portal/` that represents the *pharmacy returns portal* the business wants to match/beat in feel and completeness.
- **Current Portal** — the existing Next.js pharmacy portal under `Frontend/`.

The goal is to describe **what the pharmacy user needs to be able to understand, trust, decide, and do** — and where today's portal falls short of that. No code, no components, no tech — just product/UX work items.

---

## 1. Executive Summary

Today's portal is **feature-rich** but **narrative-poor**. The reference portal does fewer things, but every screen answers three questions without the user having to think: *"What am I looking at?", "What should I do next?", and "Who do I call if I'm stuck?"*

The gap is NOT "we're missing features". The gap is:

1. **Discoverability** — half of what the app can do is hidden from the sidebar; users have to know URLs.
2. **Trust & Transparency** — the reference portal *explains* money (OCS vs POR, fees, 90‑day rules) inline; our portal shows numbers with no story.
3. **Escalation paths** — the reference portal has a **phone number, a chat, and a "Request Research" button** visible everywhere money is involved. Our portal has a ticket form that uses a browser alert.
4. **Compliance & policy cues** — return‑window rules, 30‑day limits, pedigree/POR terms, e‑sign — are **invisible** in our UI.
5. **Consistency** — two "Payments" screens, two "Analytics & Reports" titles, mocked data next to live data, disabled tabs, a chatbot that may never appear. Users cannot tell what's real.
6. **Guidance** — zero onboarding, zero empty‑state coaching, zero tooltips on the things that matter most (NDC, DEA, license plate, TBD, etc.).

Everything below is a task list to close these gaps, written for a product owner / UX lead to hand off.

---

## 2. High‑Level UX Themes (the "why" behind the tasks)

| Theme | Reference portal does this… | Our portal does this… |
|---|---|---|
| **Reference‑number first** | Almost every screen is anchored by a **RefNum picker**; selecting one filters the whole page. The user always knows which return they are looking at. | We anchor by **license plate**, but it is not a global, persistent selector — users re‑pick context on each screen. |
| **Money is explained, not just shown** | **Tooltips, legends, and inline paragraphs** tell the user what OCS vs POR means, what fees apply, what "Request Research" does, what the 90‑day clock is. | Numbers appear in tables. There is no inline copy teaching the user what the numbers mean. |
| **Escalation is always one click away** | **1‑800‑xxx**, **chat**, and **Request Research** are repeated on the dashboard, check page, add‑credit page, return‑limit modal. | Support lives behind a sidebar item that is commented out; the ticket UI uses browser `alert()`. |
| **Compliance is communicated** | **30‑day return limit modal**, **e‑sign T&C**, **pedigree / POR policy**, **proof of destruction** are first‑class screens. | None of these are surfaced; users who need them don't know they exist. |
| **Documents are the output** | **Print RA, Print Labels, Return Packet, Controlled Substance Report, Destruction Proof** are front and center — with quotas ("you've printed 2 of 3") and gating. | PDF outputs exist deeper in flows; no visible quota, no "you already printed this" feedback. |
| **One portal, one voice** | Consistent language (RefNum, RA, NDC, POR…) and consistent action words (View, Print, Request, Add). | Mixed labels ("Create Return" vs "Start a new return", "Credits" vs "Payments & Credits", "Analytics & Reports" in two places). |

---

## 3. Module‑by‑Module UX Tasks

Each task describes **a user need** and **what the user should experience** — not how to build it.

### 3.1 Global Shell / Navigation

**What's wrong today**
- Sidebar shows 7-10 items but many other routes exist and are reachable by URL but not discoverable: Dashboard, Support, Notifications, Documents, Shipments, Payments (separate from Credits), Reports (separate from Analytics), Inventory, Marketplace, Subscription, Barcode Generator.
- Branding wavers between "PharmAnalytics" and "Data Analytics Platform".
- Notifications dropdown and `/notifications` page show *different data* (one live, one mocked). The user can't tell which is true.
- The top bar does not show *which pharmacy* the user is currently working in when a parent org has switched branches — they see the switcher, not the current context.

**UX tasks**
- **T‑N1.** Build a sidebar that is honest: every top‑level feature the pharmacy is paying for should be one click away. Group items under clear headers ("Returns", "Money", "Reports", "Account").
- **T‑N2.** Pick one product name and one tagline, and use them in the login title, sidebar logo, email subjects, and support.
- **T‑N3.** Give the top bar a permanent "You are working in: *Prime Pharmacy – Downtown*" badge when the user is inside a branch context.
- **T‑N4.** Make notifications one source of truth. Bell dropdown and full notifications page must never disagree.
- **T‑N5.** Decide whether `/dashboard`, `/reports`, `/payments`, `/inventory`, etc. are real products or archived prototypes. Either put them in the nav (with clear names) or remove them from the running app.
- **T‑N6.** Add a permanent "Need help?" control (phone, chat, ticket) pinned to the shell — visible on every page, not buried under Settings.

### 3.2 Dashboard / Home

**What's wrong today**
- Our `/dashboard` is not discoverable (not in sidebar). When reached, it shows generic tiles (Earnings, Documents, Packages) with no link out to the thing each tile represents.
- The reference "dashboard" is a **per‑return financial summary**: the user picks a RefNum and immediately sees *what money was expected, what arrived, what is missing, and which check paid it*. That is the single most useful screen in the reference portal.
- The `/portal` page currently redirects silently to "first allowed route" or shows "No access yet" with no recovery path.

**UX tasks**
- **T‑D1.** Replace the generic KPI dashboard with a **"Return Summary"** home: pick a return → see expected vs received credit, list of credit types (OCS, Manufacturer Direct, POR), a timeline, and three clear CTAs: *View Check*, *View Details*, *Add Credit*.
- **T‑D2.** Every tile and chart on the dashboard must be clickable and must lead to the exact filtered view of the underlying module.
- **T‑D3.** Add an "all‑time" section below the per‑return view: total returnable value, total non‑returnable value, reasons for non‑returnable, trend over time.
- **T‑D4.** The "No access yet" screen must tell the user exactly who to contact (admin email, phone) and offer a "Request access" button that sends a message.
- **T‑D5.** Show the **pharmacy display name** (not ID) in the H1 ("Welcome, Prime Pharmacy Inc").
- **T‑D6.** Include a quick‑action row: *New Return, Print Labels, View Last Check, Add Credit, Get Help*.

### 3.3 Returns (the core loop)

**What's wrong today**
- Creation, detail, TBD items, destruction, scanning, finalize, wine cellar are five separate sidebar entries. A new user can't tell where to start.
- There is no single "Return History" destination that the user can bookmark — `/returns` is a filterable list, not a history.
- The reference portal gates return creation behind a **signed Terms & Conditions e‑sign**; we have no equivalent legal gate.
- The reference portal shows a **30‑day return limit modal** that teaches the user when they can return again. We silently allow or silently block.
- The reference portal caps **label reprints** and shows a user‑visible quota ("You've printed 2 of 3, call to print more"). We don't.
- Our return detail page mixes **operational steps** (scan, edit, add items) with **finalization/shipping** in a way that is hard to follow.

**UX tasks**
- **T‑R1.** Collapse "Returns, Create Return, TBD Items, Destruction, Wine Cellar" into **one primary "Returns" menu** with a clear sub‑structure: *New Return · In Progress · Submitted · History · Destruction · Wine Cellar*.
- **T‑R2.** First‑time return creation must present an **e‑sign Terms & Conditions** screen. It must explain the RSI Pedigree Policy, POR program, and 10/30/90‑day options in plain language, and capture the user's typed name + date.
- **T‑R3.** When a user tries to start a return within 30 days of the last one, show the **30‑day policy modal** with: last return date, next allowed date, the support phone number, and "Start chat" button.
- **T‑R4.** The return detail page must be one page with three clear stages, each with its own state: *Items → Review → Ship & Finalize*. Each stage has its own "done/not done" indicator.
- **T‑R5.** On the Submitted Returns view, show **per‑line NDC, Label Name, Package, Cases, Full, Partials, DEA class, Lot, Exp Date** — exactly these columns. Today's columns are sparser than reference.
- **T‑R6.** Print flows must be explicit about **quotas and limits**: "Print RA Form (2 of 3 available)" and "Print Labels (already printed 1 time)". If limit reached, show the call/chat escalation.
- **T‑R7.** "TBD" is jargon. Tooltip on every occurrence: "TBD = item we could not auto‑classify as returnable or non‑returnable yet. Resolve to move forward."
- **T‑R8.** The `/returns/destruction` screen must have a visible explanation of what destruction means, what happens next, and when the user will get the **Proof of Destruction** document.

### 3.4 Credits, Checks, Deductions (the "where's my money" loop)

**What's wrong today**
- We have one `/credits` page (live data) *and* one `/payments` page (mocked). They fight each other.
- Users cannot tell the difference between **OCS (One‑Check‑Select)** and **POR (Pay‑On‑Receipt)** because we don't use those terms or explain them.
- The reference portal has an **"Add Credits" workbench** where the pharmacist reconciles what the manufacturer actually paid versus what RSI estimated — with a **"Request Research"** button after 90 days. We have no equivalent.
- Deductions from checks (money withheld) is a separate first‑class concept in the reference portal — `View Deductions` with expandable row detail. We have nothing like it.
- Our `/credits` uses abstract labels ("Company Fee", "GPO Share") with no tooltip explaining who the GPO is or why a fee applies.

**UX tasks**
- **T‑M1.** Retire the mocked `/payments` page or mark it clearly as "Demo — not your real data". Do not ship both.
- **T‑M2.** Add a **"Checks"** page: list of physical/electronic checks the pharmacy received, with columns Return Date, RefNum, Date Paid, Check Number (clickable to PDF), Check Amount, Credit Included, RSI Credit Fee, Manufacturer Direct Credit Fee, Credit Type (OCS/POR). Include a totals row at the bottom.
- **T‑M3.** Add a **"Deductions"** page: money taken off a check, with expandable rows showing the reason/detail.
- **T‑M4.** Replace or augment `/credits` with an **"Add / Reconcile Credits"** workbench: pick a RefNum, see expected vs received per manufacturer/processor/debit memo, with a row action that opens a modal where the pharmacist records what actually came in (amount, credit type, credit memo, date, notes).
- **T‑M5.** On that workbench, a **"Request Research"** button must appear when the credit is older than ~90 days and still unreceived. Clicking it sends the case to RSI operations and tells the user "We'll contact you within X business days."
- **T‑M6.** Add a **row‑color legend** to the reconciliation table: *gray = no info yet, orange = must call, blue = credit issued to wholesaler, green = complete*. Every color must match a plain‑English sentence at the top of the page.
- **T‑M7.** Every money term must have a tooltip on first appearance: **OCS**, **POR**, **RSI Credit Fee**, **Manufacturer Direct Credit Fee**, **Debit Memo**, **Processor**, **Wholesaler**, **GPO**.
- **T‑M8.** On the checks page, include the **OCS vs POR explainer** that the reference portal shows — what each one means, the typical 80–90% upfront, and the 2–20% fees on POR. The user should never have to call support to learn the difference.

### 3.5 Invoices & Payments Out

**What's wrong today**
- There is no page where the pharmacy sees **what they owe RSI** (destruction invoices, service invoices) and pays it.
- Our `/payments` and `/credits` screens are about *incoming money*, not *outgoing invoices*.

**UX tasks**
- **T‑I1.** Add an **"Invoices"** page split in two sections: *Unpaid* (checkbox selection, "Pay Now" CTA, search, sort) and *Paid* (date, RefNum, amount, payment date, download action).
- **T‑I2.** Unpaid rows must expose a **"View Invoice PDF"** action that opens in a new tab.
- **T‑I3.** Payment success must produce a visible receipt (not just a toast) with an email copy option.
- **T‑I4.** If the user has no invoices, show an empty state explaining "Invoices appear here when a destruction or service charge is generated. You will also receive them by email."

### 3.6 Reports & Documents

**What's wrong today**
- We call `/reports` "Analytics & Reports" but it is really **distributor price optimization** (Excel export).
- We call `/analytics` "Analytics & Insights" with KPIs. Two things share one title.
- There is no single place to get the **return packet PDF, controlled substance PDF, or proof of destruction PDFs**, even though those are the legally important documents.

**UX tasks**
- **T‑RP1.** Rename `/reports` to something that describes it: **"Pricing Insights"** or **"Distributor Optimizer"**. Remove the word "Reports" from its title.
- **T‑RP2.** Create a proper **"Reports & Documents"** page, scoped by RefNum, offering: *Return Packet*, *Controlled Substance Report*, *Proof of Destruction — Controls*, *Proof of Destruction — Non‑Controls*. Each has a single "View" button that opens a PDF in a new tab.
- **T‑RP3.** When the user clicks Proof of Destruction and the return is not ready for destruction yet, show a friendly explainer: "This document is available once RSI has completed destruction. Estimated ready date: …"
- **T‑RP4.** Add a **"My Documents"** section on the profile/settings area where the user uploads and manages their **DEA** and **State Pharmacy License** files (accepted formats listed, expiration dates tracked, reminder banners when close to expiry).

### 3.7 Profile, Licenses, Store Info

**What's wrong today**
- Settings has three visible tabs (Profile, Store, Security). Notifications and Billing are disabled — users can't reach those settings at all.
- Our profile does not emphasize the **email used for RA & shipping label delivery**, which is the single most important field in the reference portal.
- **License expirations (DEA, state pharmacy)** are captured but there is no proactive "your DEA expires in 30 days" banner.

**UX tasks**
- **T‑P1.** Enable Notifications and Billing tabs or remove them. No disabled stubs in production.
- **T‑P2.** Reorganize the profile screen into clear sections: *Account Contact* (with a prominent "This is where RAs and shipping labels are emailed" note), *License Information* (DEA, state license, expirations), *Facility Information* (name, address, wholesaler, buying group, store hours), *Contacts*, *My Documents*.
- **T‑P3.** Highlight fields that are locked/read‑only with a lock icon + hover text explaining why ("License IDs are verified by RSI; to change, contact support").
- **T‑P4.** Add license expiration **countdown banners**: green > 90 days, yellow ≤ 90, red ≤ 30. Banner links to the upload action.
- **T‑P5.** On save, show an actual success state (toast + in‑line "Last saved: timestamp"), not a full page reload.
- **T‑P6.** The **Wholesaler** and **Buying Group** dropdowns are enormous. Add search, recent selections, and the ability to say "Not listed — call me".
- **T‑P7.** Add a "Verify Profile" checklist at the top of the page with pass/fail badges per section, so the user knows if anything blocks return processing.

### 3.8 On‑Site Service / Field Rep Requests

**What's wrong today**
- We have no way for a pharmacy to request an on‑site visit by an RSI field representative.
- The reference portal has a single, focused page that captures *requested date + special instructions* and clearly tells the user "this is a request, not a confirmation — the scheduler will call you back."

**UX tasks**
- **T‑OS1.** Add an **"On‑Site Service"** page with: a date picker, a free‑text "special instructions" box, a submit button, and a permanent disclaimer that the date is tentative until a scheduler confirms.
- **T‑OS2.** After submit, show a confirmation card: "Request received. Reference #XXX. A scheduler will contact you within N business days at [email/phone on file]."
- **T‑OS3.** On the same page, show the **history** of past requests with their status (requested, confirmed, completed, cancelled).

### 3.9 Support / Help

**What's wrong today**
- Support page exists but uses browser `alert()` for success/error. That feels broken.
- There is no visible **phone number** anywhere (the reference portal shows 1‑800‑579‑4804 on at least four screens).
- The chatbot may not be mounted in the app shell; if it is, suggestions are generic.
- No knowledge base, no FAQ, no onboarding tour.

**UX tasks**
- **T‑S1.** Remove all `alert()`. Use in‑page success states ("Ticket #123 submitted — we'll reply by email within 24h").
- **T‑S2.** Put a phone number, chat launcher, and ticket link in the app shell — always visible.
- **T‑S3.** Add a short **FAQ** section at the top of the support page covering: "How do I create a return?", "Why is my credit lower than expected?", "What is OCS vs POR?", "When will I get my check?", "How do I reset my password?"
- **T‑S4.** Ensure the chatbot is actually visible on every authenticated page. Seed it with pharmacy‑specific prompts (returns, credits, payments, DEA, license, on‑site visit).
- **T‑S5.** When a user is on a money screen and clicks "Get Help", pre‑fill the ticket category (*Returns & Credits*) and link the current RefNum.
- **T‑S6.** First login should trigger a short **guided tour** (5 steps max): dashboard → returns → credits → reports → profile.

### 3.10 Notifications

**What's wrong today**
- Header bell and `/notifications` page return different data.
- Marking as read happens silently when the dropdown opens — users who just glance lose their "new" state.
- No notification preferences UI (the Notifications tab in Settings is disabled).

**UX tasks**
- **T‑NT1.** Bell and full page must show the same list, same statuses, same categories.
- **T‑NT2.** "Mark as read" must be an explicit button, not a side effect of opening the dropdown.
- **T‑NT3.** Give every notification a *Title, One‑sentence body, Timestamp, Category, Primary action* (e.g. "View check" → opens the check PDF).
- **T‑NT4.** Enable notification preferences: per category (Returns, Credits, Payments, License Expiry, System), per channel (in‑app, email, SMS).
- **T‑NT5.** Introduce a concept of **critical notifications** (DEA about to expire, check not received in 90 days, return window closing) that pin to the top and cannot be dismissed without acknowledgement.

### 3.11 Authentication / Onboarding

**What's wrong today**
- Login works, SSO works when Clerk is configured, but the tenant/domain errors ("Domain not recognized") do not tell the user what to do.
- Register is a long multi‑step form; no save‑and‑continue, no progress indicator.
- After first successful login, users land on `/portal` which silently redirects — no welcome, no tour, no "what now?" guidance.

**UX tasks**
- **T‑A1.** "Domain not recognized" screen must tell the user: "This portal is reserved for registered pharmacies. If you believe this is a mistake, email [contact] or call [phone]."
- **T‑A2.** Registration must have a visible **step indicator** (Step 2 of 5) and a **save‑and‑continue** option so the user can leave and come back.
- **T‑A3.** At the top of registration, tell the user what they will need: *NPI number, DEA number, state pharmacy license, wholesaler account info, store address*. Nothing worse than hitting step 4 and discovering you need a license PDF.
- **T‑A4.** First login → welcome modal: "Hi Prime Pharmacy. Here's what you can do here…" with the guided tour from T‑S6.
- **T‑A5.** Password reset must confirm which email it sent to ("Check [p***@example.com]"), with a "didn't get it?" fallback.

### 3.12 Marketplace / Orders / Inventory / Wine Cellar / Misc

**What's wrong today**
- Many routes exist but are not on the sidebar. User has no way to know they're there.
- Marketplace has a cart icon permanently in the top bar even for pharmacies that may not use the marketplace.
- Wine Cellar's purpose is explained in the screen itself, but new users have no idea what "Wine Cellar" means before clicking.

**UX tasks**
- **T‑X1.** Decide per feature: *Ship, Archive, or Surface*.
  - Ship → put it in the sidebar with a real label.
  - Archive → take it out of the running app (not just commented out).
  - Surface → link to it from a parent module (e.g. "Inventory Analysis" link from Inventory).
- **T‑X2.** Hide the cart icon unless the pharmacy has marketplace enabled. An empty cart on a menu they never use is noise.
- **T‑X3.** Rename or prefix "Wine Cellar" at first sight: "Wine Cellar (Shelved Items)". Once clicked, the in‑page definition is fine, but the sidebar label alone is meaningless.
- **T‑X4.** Audit every "prototype" / mocked page. If it ships, it must use real data and real actions, or it's removed.

---

## 4. Cross‑Cutting UX Tasks

These apply everywhere, not to one module.

### 4.1 Language & Terminology

- **T‑L1.** Agree on ONE term per concept and use it everywhere (sidebar, page titles, buttons, emails).
  - *License Plate* vs *RefNum* vs *Reference Number* → pick one and ship it.
  - *Return* vs *Return Transaction* → pick one.
  - *Credits* vs *Payments* vs *Payouts* → pick one per meaning.
  - *Analytics* vs *Reports* vs *Insights* → disambiguate.
- **T‑L2.** Build a **glossary page** inside the portal (one click from the help menu) that defines every domain term: NDC, DEA, RA, RefNum, OCS, POR, TBD, Pedigree, Wholesaler, Buying Group, GPO, Processor, Debit Memo, Credit Memo, Destruction, Wine Cellar.
- **T‑L3.** Every button and link must start with a verb the user understands: *View, Print, Add, Request, Pay, Submit, Cancel*. No "Actions" columns with only an icon.

### 4.2 Feedback, Errors, and Loading

- **T‑F1.** Unify how success, warning, error, and info are shown. One toast library, one banner style, one inline‑error style. No mix of `alert()`, `toastify`, custom banners.
- **T‑F2.** Every error must tell the user **what happened**, **what to do next**, and **who to contact**. "Something went wrong" is never acceptable.
- **T‑F3.** Every long action (PDF generation, label print, payment) must show a **progress state** with an estimated time, not a spinner that hides forever.
- **T‑F4.** Every empty state must have:
  - A one‑line explanation of why it is empty
  - A primary CTA ("Create your first return")
  - A learn‑more link
- **T‑F5.** Destructive actions (Delete return, Cancel payment, Finalize) must show a confirmation modal that restates *what will happen* and *what cannot be undone*.

### 4.3 Escalation & Human Help

- **T‑H1.** Every money screen (checks, credits, deductions, invoices, add credit, reports) must show a persistent *"Need help with this? Call 1‑800‑… or chat with us"* strip.
- **T‑H2.** When data is missing, ambiguous, or old, the row must say so ("Waiting on manufacturer — expected by …") and offer an action ("Request research").
- **T‑H3.** Support must know context. If the user opens a ticket from the credits page, the ticket should auto‑attach the RefNum they were looking at.

### 4.4 Policy & Compliance Communication

- **T‑C1.** Any policy that can surprise the user (30‑day limit, 90‑day credit window, pedigree, POR fees, label reprint quota) must have a dedicated UI moment — a modal, a banner, or a permanent side panel — before the user hits the rule.
- **T‑C2.** Legal text (T&C, privacy, e‑sign) must have its own routable page, versioned, with a record of when each user accepted it.
- **T‑C3.** DEA and license expiry must drive **in‑app banners** with urgency levels, not just email reminders.

### 4.5 Data Consistency & Trust

- **T‑DT1.** Kill all mocked screens that are served next to real screens. Users cannot tell them apart today.
- **T‑DT2.** Every number in the UI must be traceable: click a total, see the rows that add up to it. Click a row, see the underlying document. Click the document, see the PDF.
- **T‑DT3.** Timestamps must say "at 14:02 local" — not "an hour ago" for financial data.
- **T‑DT4.** Currency formatting, date formatting, and timezone must be consistent portal‑wide (including PDFs and emails).

### 4.6 Accessibility & Inclusion

- **T‑AX1.** Every form field must have a visible label (no placeholder‑only forms).
- **T‑AX2.** Every icon‑only button must have a visible tooltip on hover and a real label for screen readers.
- **T‑AX3.** Color must not be the only signal (the green/orange/blue legend in Add Credits must also carry a shape or text tag).
- **T‑AX4.** Keyboard: tab order must follow reading order; modals must trap focus and return it on close; every destructive action is reachable without a mouse.

### 4.7 Mobile / Responsive

- **T‑MR1.** The sidebar slides over content on small screens — good. But the top bar should then collapse into a single menu with all actions (switcher, notifications, help, user) — not a cramped row of icons.
- **T‑MR2.** Tables with 10+ columns (credits, checks, returns) must have a mobile view (a card per row with the three most important fields).
- **T‑MR3.** PDF viewers and long modals must be scrollable on phones (today many open in a new tab which then becomes un‑navigable).

---

## 5. Priority / Sequence (suggested)

This is the order in which real pharmacies will feel the improvement.

**P0 — Stops the bleeding, ship first**

- T‑N1, T‑N5 (honest sidebar, remove prototype pages)
- T‑M1, T‑DT1 (one credits page, kill mocked payments)
- T‑F1, T‑S1 (unify feedback, remove `alert()`)
- T‑H1, T‑S2 (visible phone/chat/ticket everywhere)
- T‑P1 (enable or remove disabled Settings tabs)
- T‑L1 (lock vocabulary)

**P1 — Makes the portal feel trustworthy**

- T‑D1 → T‑D6 (real home screen)
- T‑M2, T‑M3, T‑M4, T‑M5, T‑M6, T‑M7, T‑M8 (money transparency suite)
- T‑R2, T‑R3, T‑R6, T‑R7, T‑R8 (return workflow clarity)
- T‑RP1, T‑RP2, T‑RP3, T‑RP4 (reports, documents, PDFs)
- T‑I1 → T‑I4 (invoices)
- T‑NT1 → T‑NT5 (notifications)

**P2 — Reduces support load**

- T‑OS1 → T‑OS3 (on‑site service)
- T‑P2 → T‑P7 (profile / license expiry)
- T‑S3 → T‑S6 (FAQ, chatbot, tour)
- T‑A1 → T‑A5 (auth/onboarding clarity)
- T‑L2, T‑L3 (glossary, verb‑first labels)

**P3 — Polish and scale**

- T‑C1 → T‑C3 (policy comms)
- T‑DT2 → T‑DT4 (drill‑down traceability)
- T‑AX1 → T‑AX4 (accessibility)
- T‑MR1 → T‑MR3 (mobile)
- T‑X1 → T‑X4 (decide the fate of every dormant route)

---

## 6. What the Reference Portal Has That We Must Adopt (one‑glance checklist)

- [ ] RefNum‑anchored dashboard with Expected vs Received credit summary
- [ ] OCS vs POR explained inline (tooltip + paragraph)
- [ ] E‑sign Terms & Conditions before first return
- [ ] 30‑day return limit modal with phone + chat
- [ ] Print RA quota + Print Labels quota, with escalation on limit
- [ ] Submitted Returns table columns: NDC, Label Name, Package, Cases, Full, Partials, DEA, Lot, Exp
- [ ] Reports page scoped by RefNum: Return Packet, Controlled Substance, Proof of Destruction (Controls / Non‑Controls)
- [ ] View Checks page with OCS/POR column + totals row + clickable check PDF
- [ ] View Deductions page (master/detail expand)
- [ ] Add Credits reconciliation workbench + Request Research + row‑color legend
- [ ] Invoices page split Unpaid vs Paid, pay action, PDF view
- [ ] On‑Site Service request with "tentative until scheduler confirms"
- [ ] My Profile with license expiry tracking + DEA / state license document upload + "this is where RAs/labels are emailed" call‑out
- [ ] Permanent phone number + chat launcher + support ticket on every money screen
- [ ] Glossary of domain terms
- [ ] One product name, one tagline, one terminology

---

## 7. What Our Current Portal Has That the Reference Doesn't (do not lose these)

Not every reference item is better. Keep:

- **Branch / tenant architecture** — parent‑org pharmacies switching between branches. Reference portal is single‑pharmacy. Keep and improve T‑N3.
- **Roles & Permissions** UI — the reference portal has none. Keep; make sure it's reachable.
- **Analytics dashboards** (`/analytics`) — KPI tiles, tabs, trend charts. Rename but do not delete.
- **Distributor / pricing optimization** — this is a differentiator. Rename to "Pricing Insights" but keep.
- **Marketplace + Orders** — if shipping to customers, keep. Otherwise archive.
- **Barcode generator** — useful tool; link from Returns.
- **Warehouse / Inventory modules** — reference portal has no equivalent. Surface via sidebar with clear scope.
- **Chatbot** — reference portal has none. If we mount it and seed it right, it becomes a real advantage.

---

## 8. Deliverables for Product + Design (what "done" looks like)

- A **navigation spec** (sidebar + top bar + mobile menu) that fits on one page and names every menu item (T‑N1, T‑N5).
- A **glossary doc** with every domain term and its one‑sentence definition (T‑L2).
- A **copy deck** covering empty states, error states, success states, policy modals, escalation strips, confirmation dialogs (T‑F1 → T‑F5, T‑C1).
- A **notification matrix**: category × channel × default preference × critical/non‑critical (T‑NT4, T‑NT5).
- A **first‑login tour script**: 5 steps, 1 sentence each (T‑S6, T‑A4).
- A **policy surface map**: every rule that can surprise the user and where in the UI it appears (T‑C1, T‑R2, T‑R3, T‑R6).
- A **screen‑by‑screen audit** of the current app that labels each screen as *Ship / Archive / Surface* (T‑X1).

---

*Document owner: Product / UX. Engineers consume this only after product has signed off on priority and copy.*
