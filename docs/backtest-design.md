# Backtest Feature, Design Doc

Status: draft for review. No code yet.
Scope: v1. Buy rules only, crypto assets only, single asset per run.

## 1. Goal

Let a user answer one question: "does my buying rule set actually beat plain DCA?"
Every backtest runs the user's rule set and a plain 1x DCA control over the same dates,
same base amount, same asset, and shows the difference.

## 2. What already exists (reuse, do not rebuild)

- `server/src/services/historicalPriceService.ts`. Full daily close history from
  Binance klines, paginated, 2h in-memory cache, `toBinancePair()` symbol mapping
  with `SYMBOLUSDT` fallback, clean 400 handling for unlisted pairs.
- `server/src/controllers/simulatorController.ts`. Plain DCA simulation: schedule
  generation (`advanceDate`), nearest-price binary search with a 3-day gap guard
  (`findNearestPrice`), chart points, buy records.
- Rule set models: `BuyingRuleSet` + `BuyingRuleSetRow` with `strategyType`
  (currently `DRAWDOWN_ATH`) and JSON `params` + `multiplier` per row.

The backtest engine is the simulator loop plus rule evaluation plus a control run.
No new external dependencies, no new DB tables required for v1 (the in-memory
history cache is sufficient; a `HistoricalPrice` table is a v2 option if Binance
rate limits or cold starts become a problem).

## 3. Engine

### 3.1 Inputs

- `assetId` (must resolve to a Binance pair)
- `ruleSetId` (a `BuyingRuleSet` owned by the user)
- `startDate`, `endDate` (optional, defaults to today)
- `amountUsd` (base buy), `frequency`, `intervalDays` (CUSTOM only)

Prefill from a plan when launched from plan context, but keep the engine
plan-agnostic: it takes raw parameters.

### 3.2 Evaluation loop

For each scheduled buy date (reuse `advanceDate`):

1. Resolve price via `findNearestPrice`. If null (data gap), skip the date and
   count it; report skipped dates in the result.
2. Compute the signal as of that date. For `DRAWDOWN_ATH`: running maximum of
   the price series from the start of available data up to and including the
   current date. Never use today's ATH or `athOverride`. This is the
   point-in-time rule and it is what makes results honest.
3. Match the signal against the rule set rows (same matching logic the live
   evaluator will use; extract it into a shared pure function, e.g.
   `server/src/services/ruleEvaluation.ts`, so live and backtest can never drift).
4. Buy `multiplier * amountUsd`. No matching row means 1x (default band).
5. In the same iteration, record the control buy: always 1x `amountUsd`.

The engine is a pure function: `(priceSeries, schedule, ruleRows, amountUsd) -> result`.
No DB access inside the loop. This makes it unit-testable with fixture series.

### 3.3 Outputs

Per strategy and control:

- totalInvested, totalQuantity, averageBuyPrice, finalValue, ROI %
- buys: date, price, multiplier applied, amountUsd, quantity
- chart series: date, portfolioValue, totalInvested

Comparison block:

- delta finalValue (USD and %), delta averageBuyPrice, delta totalInvested
- skippedDates count, dataStartDate, requestedStartDate (for the clamp notice)

Note: strategy and control may invest different totals (multipliers). Always show
both ROI % and absolute USD so neither side looks artificially better.

## 4. API

`GET /api/backtest` (auth required), validation with zod like the simulator.
Sits next to `/simulator` in `server/src/routes/index.ts`.

`GET /api/backtest/availability?assetId=...` returns, without running anything:

```
{ available: boolean, reason?: 'NOT_CRYPTO' | 'NOT_LISTED' | 'PROVIDER_DOWN',
  dataStartDate?: string, pair?: string }
```

The availability endpoint is what powers the blocking UX below. It should answer
from cache when possible: a successful history fetch proves availability, and a
prior 400 for a pair can be cached as NOT_LISTED for the same TTL.

## 5. Data availability: blocking actions and messages

Principle: block before submission, never after. The user should never fill a
form, click Run, and then learn the asset cannot be backtested.

### 5.1 Decision table

| Case | Detection | Action | Message |
|---|---|---|---|
| Asset type is METAL, STOCK, ETF, OTHER | `asset.assetType` locally, no API call | Disable Backtest button. Icon-only buttons get `title="Backtesting is only available for crypto assets"` | "Backtesting currently supports crypto assets only. {name} is {type}." |
| Crypto, not listed on Binance | availability endpoint returns NOT_LISTED | Keep button enabled, show blocking state inside the modal before the form, with a Close button | "No price history is available for {symbol}. Backtesting needs daily history from Binance, and this asset is not listed there." |
| Listed, but history starts after requested start date | `dataStartDate` vs `startDate` | Do not block. Clamp the range, run, show a notice above results | "Price history for {symbol} starts on {dataStartDate}. Results are computed from that date." |
| Listed, history shorter than ~90 days | `dataStartDate` within 90 days of today | Allow run, show a warning notice with results | "Only {n} days of history exist for {symbol}. Treat these results as indicative, not conclusive." |
| Provider unreachable (timeout, 5xx, geo-block) | availability or run call fails | Non-blocking error state in modal with a Retry button | "Could not load price history right now. This is a data provider issue, not a problem with your account. Try again in a few minutes." |
| Data gaps inside the range | skippedDates > 0 in result | Show results, add an info line | "{n} scheduled buys were skipped because no price was available within 3 days." |
| Rule set has no rows | local check | Disable Run inside the modal | "This rule set has no rows yet. Add at least one row to backtest it." |

### 5.2 UX rules for these states (per project rules)

- All disabled icon-only buttons carry a `title` explaining why.
- Blocking states live inside the backtest modal, not as toasts. Toasts disappear;
  the user needs to read why their asset is not supported.
- Every state must look correct in dark and light mode and on mobile.
- Never use an em dash in any of these messages.
- The NOT_LISTED message should not feel like a dead end. Append: "Major assets
  like BTC, ETH and SOL are fully supported."

### 5.3 Honesty notices (always shown with results)

- "Backtests use daily closing prices. Live purchases execute at {scheduledTime},
  so real results will differ slightly."
- "Past performance does not predict future results."
- For DRAWDOWN_ATH: "Drawdown is measured against the highest price within the
  available data window, which may be lower than the true all-time high early in
  the period."

## 6. UI

Entry points:

1. RuleSets view: a Backtest action on each buying rule set card/row.
2. PlanDetail: "Backtest this plan's active rule set", prefilled with the plan's
   asset, amount and frequency.

Flow: action opens a modal (project rule: never a separate page or inline form).
Modal steps: parameters form -> loading -> results. Results show:

- Headline verdict, e.g. "Your rule set ended {x}% ahead of plain DCA" (or behind;
  never hide a loss).
- One chart: strategy portfolio value vs control portfolio value over time, with
  buy markers sized by multiplier. Strategy uses the brand accent, control uses a
  neutral gray. Both lines must meet contrast rules in both modes.
- Compact stats table (totals, avg buy price, ROI) following the table styling
  rules: `bg-gray-900` container, `divide-gray-700`, `hover:bg-gray-700/50
  transition-colors`.
- The honesty notices from 5.3.

Mobile: form fields stack vertically, chart goes full-width with reduced height,
stats table becomes a two-column key/value list.

## 7. Edge cases

- DAILY frequency over 6+ years is ~2200 iterations. Fine server-side; cap the
  range at 10 years to bound response size.
- Asset symbol changes (MATIC -> POL) are already handled by the pair map.
- Stablecoins backtest trivially flat; no special handling, results speak for
  themselves.
- Binance geo-blocks US IPs. The call is server-side, so verify the deployment
  region is not US-based; if it is, pin the serverless function region or add a
  fallback klines mirror. Treat failures as PROVIDER_DOWN, never as NOT_LISTED.
- Multiple rule sets on one plan: backtest takes exactly one rule set per run.
  Comparing two rule sets means two runs; a side-by-side compare is v2.

## 8. v2 candidates (explicitly out of scope)

- Sell rules in the backtest (requires proceeds-handling decisions).
- `HistoricalPrice` DB table if cache misses or rate limits hurt.
- Second data provider for stocks, ETFs and metals.
- Side-by-side rule set comparison.
- New strategy types (cost basis bands, SMA distance, RSI) plug into the same
  engine via the shared rule evaluation function.

## 9. Testing notes

Unit-test the pure engine with synthetic price series: a monotonic rise (strategy
should equal control if no bands trigger), a crash-and-recover series (strategy
should beat control with sensible drawdown bands), a series with gaps (skipped
dates counted), and a series shorter than the requested range (clamp notice).
