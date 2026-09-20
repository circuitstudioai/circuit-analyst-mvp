# Market Desk vNext — Living Thesis

**Document type:** Product requirements document and delivery plan  
**Status:** Approved for Milestones 1–3
**Date:** 2026-09-19  
**Owner:** Circuit Studio AI  
**Implementation status:** Milestones 1–3 authorized on `feat/market-desk-vnext-prototype`.

## 1. Executive summary

Market Desk vNext is an AI research desk that continuously maintains a living investment thesis for every public company a user cares about and interrupts the user only when new evidence may materially change that thesis.

The product promise is:

> Know what changed, why it matters, and what would change your mind.

The product is not primarily a stock screener, a chat interface, a stream of news, or a source of personalized trade instructions. It delegates recurring research work to a set of evidence-constrained finance agents, turns their work into an inspectable thesis, and helps the user make and revisit their own judgments.

The first validation artifact will cover five deliberately different companies—NVDA, COST, XOM, JPM, and HIMS—through one reusable product system. It will contain a Change Inbox, five Living Theses, and issue-specific Decision Rooms. Controlled evidence fixtures are acceptable in the first prototype; company-specific pages and hard-coded company logic are not.

## 2. Product decision

### 2.1 Strongest angle

The product's distinctive value is the combination of:

1. **Delegation:** the desk performs research between user questions.
2. **Continuity:** each company has a versioned, living thesis rather than a succession of disconnected reports.
3. **Material change detection:** the home screen prioritizes evidence that may change a belief, not everything that happened.
4. **Decision support:** users see affected assumptions, disagreements, scenarios, and invalidation conditions.
5. **Research integrity:** conclusions are evidence-linked, freshness-aware, historically inspectable, and allowed to abstain.

### 2.2 Product objects

- **Change Inbox:** the primary home screen, ranked by significance rather than chronology.
- **Living Thesis:** the durable company record containing claims, assumptions, evidence, risks, catalysts, valuation context, confidence, and invalidation conditions.
- **Decision Room:** a workspace generated for a material change, showing what changed, why it matters, competing interpretations, evidence lineage, relevant scenarios, and a user judgment checkpoint.
- **Ask the Desk:** a contextual research interaction available throughout the product, but not the primary product loop.
- **Decision Lab:** an optional educational view of named models and their Buy/Hold/Sell classifications, assumptions, horizons, and historical results.

### 2.3 Core loop

Add companies → establish baseline theses → monitor new evidence → link evidence to existing claims → rank material changes → open a Decision Room → record the user's judgment → continue monitoring from that context.

## 3. Goals and non-goals

### 3.1 Goals for vNext validation

- Prove users understand the difference between news, evidence, a thesis change, and a model decision.
- Determine whether a Change Inbox is a stronger recurring destination than question-first research alone.
- Demonstrate that one generic system can represent five materially different company archetypes.
- Show evidence lineage from source to fact to claim to thesis change.
- Let a user preserve or update their own view without presenting the system as their fiduciary or trader.
- Validate that users want the desk to continue monitoring explicit assumptions or questions.
- Preserve the current question-first alpha as a working foundation and fallback during validation.

### 3.2 Non-goals for the five-company prototype

- Broad-market coverage or arbitrary user-entered tickers.
- Live continuous monitoring, push notifications, or unattended scheduling.
- Brokerage connections, order execution, position sizing, or portfolio rebalancing.
- Personalized recommendations based on wealth, tax status, risk tolerance, or full portfolio composition.
- Production-grade market-data licensing or commercial data SLAs.
- A universal valuation model across company types.
- Exposed multi-agent transcripts, avatars, or theatrical agent debate.
- Claims of alpha, guaranteed returns, or model outperformance.

## 4. Target user and jobs

### 4.1 Initial target user

A self-directed US public-equity investor who follows roughly 5–25 companies, wants to understand the case rather than blindly follow a signal, and lacks the time to repeatedly reconcile filings, earnings, valuation, risks, and material news.

The prototype should also be understandable to a serious prospective investor who has not yet built a portfolio.

### 4.2 Primary jobs to be done

- “Build the initial case for the companies I own, watch, or am considering.”
- “Tell me what changed since I last checked, but only when it matters.”
- “Show me which assumption is affected and why.”
- “Give me the strongest supported bull and bear interpretations.”
- “Show what evidence would resolve the uncertainty or invalidate the thesis.”
- “Remember what I decided and what I asked you to watch.”

## 5. Product principles

1. **Changes before feeds.** Rank potential belief changes above chronological information.
2. **Claims before prose.** The thesis is a structured set of claims, not only a generated report.
3. **Evidence before confidence.** Confidence follows evidence quality, relevance, and freshness.
4. **Disagreement is a feature.** Preserve meaningful model or analyst conflict rather than forcing consensus.
5. **Abstention is valid.** Show insufficient evidence when the system cannot support a conclusion.
6. **User judgment remains separate.** Never rewrite a user decision as an AI conclusion or vice versa.
7. **Deterministic control plane.** Code owns identity, lineage, diffs, thresholds, permissions, quotas, and audit history; models propose analysis and explanations.
8. **Progressive disclosure.** Lead with the decision-relevant change and keep calculations, agent outputs, and source passages inspectable.
9. **No company-specific product exceptions.** Differences belong in archetype templates and data, not bespoke UI or ticker conditionals.

## 6. Scope: five-company prototype

### 6.1 Prototype company set

| Company | Archetype under test | Primary analytical stress |
| --- | --- | --- |
| NVDA | High-growth semiconductor/platform | Expectations, margins, capex demand, geopolitical risk |
| COST | Mature quality compounder/retailer | Membership economics, execution quality, valuation |
| XOM | Commodity/cyclical integrated energy | Scenario dependence, capital allocation, cycle sensitivity |
| JPM | Regulated diversified financial | Bank-specific accounting, credit, capital, rates |
| HIMS | Emerging consumer-health platform | Growth quality, regulation, execution, financing/dilution |

### 6.2 Prototype surfaces

1. **Mandate setup**
   - Preloaded five-company set for usability testing.
   - Each company may be marked `Owned`, `Watching`, or `Exploring`.
   - Optional horizon and one user concern; neither is required.

2. **Change Inbox**
   - Contains at least one realistic material event per company.
   - Sorts by materiality, with filters for company, status, and change type.
   - Distinguishes `Thesis changed`, `Assumption under pressure`, `New evidence—no thesis change`, `Upcoming catalyst`, and `Meaningful disagreement`.
   - Shows the affected claim, thesis impact, freshness, and why the item deserves attention.

3. **Living Thesis**
   - Evidence stance: `Favorable`, `Mixed`, `Unfavorable`, or `Insufficient evidence`.
   - Thesis status: `Strengthened`, `Unchanged`, `Under pressure`, or `Invalidated`.
   - Valuation setup: `Attractive`, `Fair`, `Expectations stretched`, or `Insufficient evidence`.
   - Three to seven core claims with state, importance, confidence, and source links.
   - Strongest bull case, strongest bear case, what appears priced in, catalysts, uncertainties, and invalidation conditions.
   - Version history and a plain-language thesis diff.
   - Research freshness and missing-evidence state.

4. **Decision Room**
   - What changed: before/after evidence and claim state.
   - Why it matters: affected economics and thesis importance.
   - Bull and bear interpretation tied to evidence.
   - One issue-appropriate decision object: scenario sensitivity, expectations-versus-results, evidence conflict map, catalyst timeline, or peer comparison.
   - Evidence trail: source passage → normalized fact → affected claim → thesis effect.
   - Model decisions and disagreement, when available.
   - What would resolve the uncertainty.
   - User actions: `Keep my view`, `Update my view`, `Watch this assumption`, and `Ask the desk`.

5. **User judgment and monitoring intent**
   - Save the user's selected action and optional rationale separately from system analysis.
   - Let the user express a watch condition in natural language.
   - In the prototype, simulate future monitoring behavior and clearly label it as not yet active.

6. **Decision Lab**
   - Secondary, optional surface.
   - Shows a named model's `Buy`, `Hold`, or `Sell` classification only with strategy, horizon, as-of time, confidence, assumptions, invalidation, freshness, and historical evaluation status.
   - Does not translate model output into “You should buy/sell.”

7. **Ask the Desk**
   - Available in company and Decision Room context.
   - Preserves the current question-first capability.
   - Answers using the active thesis, change event, and evidence bundle.

### 6.3 Controlled fixture rules

- Evidence, thesis versions, events, and model decisions may be fixture-backed in the first prototype.
- Fixtures must conform to the intended production contracts and be loaded through the same view-model boundary used by live data later.
- Fixtures must include source URLs, publication/retrieval times, evidence IDs, and explicit missing-data states.
- The UI must not contain ticker-specific conditional rendering.
- At least one event must result in no thesis change, and at least one company must contain meaningful analyst/model disagreement.

## 7. User experience requirements

### 7.1 First-run flow

1. User sees the mandate: “Which companies should your research desk cover?”
2. Prototype offers the five companies and allows a mandate label.
3. System shows real workflow stages: identifying business drivers, gathering current evidence, testing assumptions, constructing the counter-case, and validating claims.
4. Each company becomes usable independently when its baseline is ready.
5. User lands in the Change Inbox with a short explanation of why the first item matters.

### 7.2 Return flow

1. User lands in the Change Inbox.
2. Inbox communicates how many items may change a thesis versus how much information was processed silently.
3. User opens a high-materiality item.
4. Decision Room communicates the change within 30 seconds of reading.
5. User records a judgment or watch condition.
6. Item moves to a resolved state without erasing the underlying research event.

### 7.3 Required states

- Empty inbox / nothing material changed.
- Baseline research in progress.
- Partial evidence available.
- Stale evidence.
- Insufficient evidence / abstention.
- Agent or model disagreement.
- Event processed with no thesis change.
- Failed evidence retrieval with recovery action.
- Signed-out and signed-in behavior consistent with the existing alpha.
- Desktop and mobile layouts.

### 7.4 Accessibility and comprehension

- Core flows are operable by keyboard and screen reader.
- Color is not the only carrier of stance or change.
- Finance terms that are not broadly familiar receive short inline explanations.
- The distinction between fact, model inference, system thesis, model decision, and user judgment is visible in labels and hierarchy.
- Copy uses educational decision-support language and avoids urgency or trading commands.

## 8. Functional requirements

### 8.1 Company mandate

- Create, read, update, and archive a mandate.
- Mandate kinds: `owned`, `watching`, `exploring`.
- Store optional horizon and user concern without inferring suitability or position advice.

### 8.2 Baseline thesis

- Resolve company identity deterministically.
- Select an archetype research template.
- Assemble a versioned evidence dossier.
- Generate structured claims and counterclaims with evidence IDs.
- Produce thesis version 1 only after claim validation.
- Preserve missing evidence and abstention states.

### 8.3 Evidence and lineage

Every evidence item must record:

- Company, source type, source URL, and source passage or durable reference.
- Observed period, publication time, and retrieval time.
- Normalized value, units, and calculation method when applicable.
- Freshness, confidence, and missing-data state.
- Content hash or equivalent deduplication key.

Every factual thesis statement must be traceable to one or more evidence items.

### 8.4 Change detection

- Compare evidence newer than the prior thesis cutoff with existing claims.
- Classify the effect as `supports`, `challenges`, `supersedes`, `adds uncertainty`, or `no material effect`.
- Generate structured claim and thesis diffs; do not overwrite history.
- Materiality must consider claim importance, evidence magnitude/reliability, corroboration, stance change, catalyst proximity, and explicit user watch conditions.
- Events below the interruption threshold remain accessible in research history.

### 8.5 Decision Room selection

- Select the room's primary object from the event type and available evidence.
- Never show a scenario control or valuation output without a supported calculation contract.
- Validate factual generated text against cited evidence before display.
- Preserve partial-result and failure states instead of fabricating completeness.

### 8.6 User judgment

- Store user judgment separately from the system thesis.
- Retain history, author, timestamp, and optional rationale.
- A future run may reference the judgment but must not silently change it.
- Natural-language watch conditions must be stored both as entered and, when possible, as a reviewable structured rule.

### 8.7 Model decisions

- A model decision requires model/strategy name, version, horizon, classification, confidence, inputs, assumptions, invalidation, as-of timestamp, and evaluation status.
- Aggregate model disagreement may be displayed; forced consensus is not required.
- Historical results must include all eligible calls under a declared evaluation method, not selected examples.

## 9. Domain and data model

The production-oriented prototype contract should include:

- `company_mandates`: user-to-company relationship, mandate kind, horizon, concern, state.
- `research_templates`: versioned archetype requirements, lenses, claim schema, and triggers.
- `theses`: durable company thesis identity and current-version pointer.
- `thesis_versions`: stance, status, summary, cutoff, confidence, freshness, and provenance.
- `thesis_claims`: versioned claim, importance, state, confidence, and claim type.
- `evidence_items`: normalized facts and source metadata.
- `claim_evidence_links`: support/challenge relationship and strength.
- `research_events`: new information, event type, processing status, and materiality.
- `claim_changes`: before/after state, effect type, explanation, and materiality contribution.
- `model_decisions`: structured strategy output and evaluation metadata.
- `decision_rooms`: selected presentation object, affected claims, generated narrative, and validation status.
- `user_judgments`: user-owned action, rationale, thesis version, and timestamp.
- `monitoring_rules`: user/system rule, structured condition, review status, and activation state.
- `notifications`: delivery decision and audit record; inactive in the first prototype.

### 9.1 Invariants

- A thesis version is immutable after publication; corrections create a new version or explicit correction record.
- A claim state change references both old and new thesis versions.
- A factual claim shown to the user has a valid evidence link or is visibly marked as interpretation/uncertainty.
- A user judgment cannot be generated or modified by an agent.
- A model output cannot be relabeled as a personalized user action.
- Archetype and prompt versions are recorded for reproducibility.

## 10. Agent and research contract

### 10.1 Baseline workflow

Research planner → evidence collection/normalization → company analyst → risk analyst → deterministic valuation/other eligible engines → decision editor → claim validator → persisted thesis version.

### 10.2 Monitoring workflow

Cheap event detection → identity and deduplication → relevance filter → targeted evidence refresh → affected-claim analysis → structured diff → materiality gate → inbox item or silent history.

### 10.3 Agent responsibilities

- **Research planner:** select evidence requirements and relevant lenses for the company archetype and question.
- **Company analyst:** construct the strongest evidence-supported operating case.
- **Risk analyst:** challenge assumptions, surface contrary evidence, and identify unknowns.
- **Deterministic engines:** own reproducible calculations such as price context, valuation scenarios, and rule-based signals.
- **Decision editor:** reconcile without erasing disagreement and produce readable explanations.
- **Claim validator:** reject or quarantine unsupported factual claims and invalid citations.

### 10.4 Operational limits

- Prefer targeted reruns over running every agent for every event.
- Reuse evidence and completed analysis until source freshness requires invalidation.
- Record calls, tokens, latency, provider, cost, failures, and fallback for every research run.
- Enforce per-run budgets and explicit partial completion.
- A model or source failure must not silently produce a high-confidence thesis.

## 11. Decision-language policy

### 11.1 Allowed primary language

- Evidence stance: `Favorable`, `Mixed`, `Unfavorable`, `Insufficient evidence`.
- Thesis status: `Strengthened`, `Unchanged`, `Under pressure`, `Invalidated`.
- Valuation setup: `Attractive`, `Fair`, `Expectations stretched`, `Insufficient evidence`.
- Research framing: `Research further`, `Wait for…`, `Reassess the thesis`, `Avoid until…`.

### 11.2 Buy/Hold/Sell boundary

Buy/Hold/Sell may appear only as the inspectable output of a named educational model in Decision Lab. It must include strategy, horizon, assumptions, confidence, as-of time, invalidation, evidence freshness, and historical evaluation status.

The product must not say or imply “You should buy/sell,” recommend quantities, generate personalized position sizes, or place execution links beside a model decision.

### 11.3 Prohibited for initial release

- “Buy now,” “sell now,” or equivalent urgency in notifications.
- Personalized allocation, tax, suitability, or risk advice.
- Guaranteed or unqualified return/target language.
- Marketing claims that an educational disclaimer alone resolves regulatory obligations.

Direct recommendation language, personalization, alerts, and monetization require review by qualified US securities counsel before broad public release. This PRD is product guidance, not legal advice.

## 12. Technical approach

### 12.1 Foundation to retain

The current app remains the base for authentication, conversations, evidence handling, jobs, quotas, persistence, progressive status, feedback, source display, finance evaluation, and question-first research.

The finance test harness remains the evaluation and promotion layer for evidence packets, source lineage, deterministic calculations, engine normalization, abstention, benchmark questions, budgets, and claim validation.

### 12.2 Prototype architecture requirements

- One generic data-to-view-model path for all five companies.
- Fixture repository behind interfaces that can later be served by persistent/live adapters.
- Reusable Change Inbox, Living Thesis, Decision Room, and judgment components.
- Versioned schemas with runtime validation.
- Stable route/state structure that can accept live IDs later.
- Feature flag so the current question-first alpha remains available.
- No production schema migration in the fixture-only milestone unless separately approved.

### 12.3 Scale path

- **5 → 50 companies:** add live evidence cycles, queues, caching, cost limits, and a small set of archetype templates.
- **50 → 1,000:** add robust event ingestion, prioritization, observability, source coverage, and operational review tools.
- **1,000 → broad market:** solve entity normalization, long-tail sector logic, data licensing, reliability, and unit economics.

The UI and domain model should transfer substantially; trustworthy research operations are the principal scaling risk.

## 13. Success metrics and validation

### 13.1 Prototype usability targets

Test with at least five target-profile users after internal review.

- At least 4/5 can explain what changed and which claim it affects without assistance.
- At least 4/5 correctly distinguish the system thesis, a model decision, and their own judgment.
- At least 4/5 can locate supporting evidence and freshness.
- Median time to identify why the top inbox item matters is under 60 seconds.
- At least 3/5 choose a meaningful judgment or watch condition without prompting.
- At least 4/5 prefer the Change Inbox as a return surface over a blank chat or static watchlist for ongoing monitoring.

These are validation thresholds, not statistically conclusive market evidence.

### 13.2 Architecture and integrity gates

- All five companies render through the same schemas and shared components.
- Zero ticker-specific conditional UI branches.
- Every displayed factual thesis claim has valid evidence lineage.
- Thesis version diffs are deterministic for fixture inputs.
- Missing, stale, disagreement, and no-change states are demonstrated.
- Automated tests cover schema validation, ranking, version diff, lineage, and policy-label boundaries.
- Existing authenticated question-first flows continue to pass.
- Relevant unit tests, finance evaluation, lint, and production build pass.
- Desktop and mobile accessibility/smoke checks pass before founder review.

### 13.3 Metrics reserved for live pilot

- Baseline completion and failure rate.
- Cost and latency per baseline/update run.
- Inbox open and resolution rate.
- Decision Room completion and evidence-open rate.
- Watch-condition creation rate.
- Weekly return rate and thesis-change usefulness score.
- False-positive interruption rate and silent-event audit rate.

## 14. Delivery milestones

Work proceeds only after approval of this PRD. Implementation should occur on a new branch from an up-to-date `main`; proposed branch: `feat/market-desk-vnext-prototype`.

### Milestone 0 — Approval and execution brief

**Estimate:** review cycle; no engineering work.

**Outcome:** approved scope and no unresolved product decisions that would materially alter the prototype.

Deliverables:

- Founder-approved PRD.
- Approved product language and non-goals.
- Confirmed five companies and prototype event scenarios.
- Final branch name and merge strategy.
- Baseline screenshots or recording of the current alpha for regression reference.

Exit gate:

- Explicit written approval to create the branch and begin implementation.

### Milestone 1 — Contracts, fixtures, and test skeleton

**Estimate:** 2–3 engineering days after approval.

**Outcome:** a production-shaped, deterministic data foundation for the prototype.

Deliverables:

- Runtime-validated schemas for mandates, evidence, claims, thesis versions, events, diffs, model decisions, rooms, and judgments.
- Fixture dossiers and at least two thesis versions/events for each company.
- Archetype template definitions for the five company shapes.
- Deterministic materiality ranking and thesis-diff functions.
- Unit tests for lineage, diffing, ranking, immutability, and missing-data states.

Exit gate:

- All fixture records validate; all five companies use the same contracts; no ticker-specific view logic is required.

### Milestone 2 — Coded five-company experience

**Estimate:** 5–8 engineering days after Milestone 1.

**Outcome:** complete navigable Change Inbox, Living Thesis, and Decision Room experience using controlled fixtures.

Deliverables:

- Mandate setup and baseline-progress experience.
- Ranked Change Inbox with required categories and states.
- Living Thesis with version history, claim/evidence views, and freshness.
- Decision Room object selection and at least three object types across the five companies.
- User judgment and simulated watch-condition flow.
- Contextual Ask the Desk entry point and secondary Decision Lab.
- Responsive desktop/mobile behavior and baseline accessibility.

Exit gate:

- Complete internal walkthrough for all five companies; no hard-coded company pages; existing question-first flow remains usable behind the agreed navigation/feature flag.

### Milestone 3 — Integrity, regression, and founder review build

**Estimate:** 2–3 engineering days after Milestone 2.

**Outcome:** a reviewable Preview deployment with evidence that the prototype is coherent and safe to test.

Deliverables:

- Automated acceptance tests and existing regression suite.
- Evidence-lineage and unsupported-claim audit.
- Decision-language policy test/audit.
- Desktop/mobile browser smoke and accessibility review.
- Preview deployment and concise review script.
- Known limitations, simulated behaviors, and live-data boundaries visibly documented.

Exit gate:

- CI/build passes, critical flows pass authenticated Preview smoke, and founder accepts the prototype for user testing.

### Milestone 4 — Manual user validation

**Estimate:** 1–2 calendar weeks, primarily dependent on recruiting and scheduling five target users.

**Outcome:** evidence that the product direction is understood and valuable before live monitoring infrastructure is built.

Deliverables:

- Five or more moderated target-user sessions.
- Results against the usability targets in Section 13.
- Ranked findings by severity and product risk.
- Recommendation: proceed, revise, or stop.
- Revised PRD/UX contract if needed.

Exit gate:

- Founder approves the next vertical slice based on validation evidence.

### Milestone 5 — Five-company live vertical slice

**Estimate:** 2–4 engineering weeks after validation approval; source access and persistence decisions may change this estimate.

**Outcome:** one real evidence-to-thesis-to-change cycle using production persistence and the existing research foundation.

Deliverables:

- Persistent mandates, theses, claims, evidence links, events, diffs, and judgments.
- Live baseline thesis generation for the five companies.
- At least one live update cycle and materiality decision.
- Idempotent jobs, retries, partial completion, observability, cost/latency telemetry, and audit history.
- Fixture/live adapter parity tests.

Exit gate:

- Each company can complete a baseline; a real new event can create either a silent history record or validated inbox item; failure and abstention behavior are verified.

### Milestone 6 — 25-company archetype pilot

**Estimate:** 3–6 engineering weeks after the live slice; driven by archetype and source-coverage gaps.

**Outcome:** validate research generalization and operating economics across a deliberately varied company set.

Deliverables:

- Expanded and versioned research templates by archetype.
- Source-coverage matrix and sector-specific missing-data behavior.
- Event relevance and materiality precision review.
- Cost, latency, reliability, and analyst-intervention report.

Exit gate:

- Pre-agreed reliability, usefulness, false-positive, and unit-cost thresholds are met before user-defined watchlists or broad monitoring are enabled.

### Milestone 7 — Limited user watchlists and monitoring

**Estimate:** to be planned after the 25-company pilot and legal/data review.

**Outcome:** controlled multi-user monitoring with quotas and restrained notifications.

Deliverables:

- User-defined companies within supported archetypes and quotas.
- Scheduled/event-triggered monitoring.
- Reviewable monitoring rules and notification controls.
- Operational tooling, audit views, and support runbook.
- Counsel checkpoint for any direct recommendation language, alerts, personalization, and monetization.

Exit gate:

- Reliability, research integrity, notification quality, data rights, security, and unit economics are approved for the next release stage.

## 15. Dependencies and risks

### 15.1 Principal dependencies

- Current Circuit Analyst web app and Supabase foundation.
- Finance test harness contracts/evaluations.
- Reliable SEC, company investor-relations, market-price, and material-news inputs for the live slice.
- Product design and user-testing capacity.
- Legal review before expanding recommendation-like language or personalized alerts.

### 15.2 Principal risks and mitigations

| Risk | Consequence | Mitigation |
| --- | --- | --- |
| Prototype becomes five handcrafted demos | Little transfer to production | Shared schemas/components; prohibit ticker conditionals; contract tests |
| Too many low-value alerts | Product becomes a noisy news feed | Cheap relevance filter, claim linkage, materiality gate, silent history |
| Unsupported generated claims | Loss of trust and compliance exposure | Evidence IDs, claim validator, abstention, audit tests |
| Generic analysis across sectors | Weak or misleading theses | Versioned archetype research templates and 25-company pilot |
| Buy/Sell dominates experience | Signal-service positioning and regulatory risk | Keep primary labels evidence/thesis based; isolate model outputs in Decision Lab |
| Cost/latency grows with coverage | Poor unit economics and experience | Targeted reruns, caching, budgets, quotas, telemetry |
| Fixtures overstate live capability | Invalid validation | Clearly label simulation; use production-shaped contracts; require live slice before launch claims |
| Existing alpha regresses | Lose validated capability | Feature flag, regression suite, preserve question-first route/workflow |

## 16. Open decisions for approval

The following defaults are proposed. Approval of the PRD approves these unless explicitly changed:

1. Internal initiative name: **Market Desk vNext: Living Thesis**.
2. First prototype companies: **NVDA, COST, XOM, JPM, HIMS**.
3. Primary return surface: **Change Inbox**.
4. Current question-first alpha remains available; it is not replaced during prototype validation.
5. Prototype uses production-shaped controlled fixtures before live monitoring infrastructure.
6. Buy/Hold/Sell appears only in the secondary educational Decision Lab under the policy in Section 11.
7. Initial prototype ends at Milestone 3; Milestone 4 user testing requires a separate founder go-ahead, and Milestone 5 live infrastructure requires approval based on validation.
8. Proposed implementation branch after approval: `feat/market-desk-vnext-prototype`.

## 17. Approval record

**Requested decision:**

- [x] Approve as written and authorize Milestones 1–3 on the proposed new branch.
- [ ] Approve with listed changes.
- [ ] Revise direction before implementation.

**Founder notes:**

Approved as written for initial implementation through Milestone 3. User testing and live infrastructure remain separately gated.

**Approval date:**

2026-09-20
