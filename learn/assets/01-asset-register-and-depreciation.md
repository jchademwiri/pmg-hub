# 1. Asset Register & Valuation

> Learn how to register fixed assets, track serial numbers, calculate depreciation, and monitor digital assets and cryptocurrency holdings.

---

## What Belongs In The Asset Register?

Capital assets with an expected lifespan of more than 12 months should be recorded in the **Asset Register** (`/assets`) rather than treated as standard operating expenses:

- **Computer & Office Equipment**: Laptops, desktop workstations, high-end monitors, networking gear.
- **Production & Media Equipment**: Cameras, lighting kits, audio microphones, studio gear.
- **Digital Assets & IP**: Premium domain name portfolios, software codebases, trademarks.
- **Cryptocurrency Holdings**: Bitcoin (BTC), Ethereum (ETH) tracked via Luno exchange integration.

---

## Adding A New Asset

1. Navigate to `apps/admin -> /assets`.
2. Click **Add Asset**.
3. Fill in the asset details:
   - **Asset Name & Category**: (e.g. _MacBook Pro M3 Max 64GB_).
   - **Serial Number / Asset Tag**: For hardware inventory tracking.
   - **Purchase Date & Cost**: Actual acquisition price in ZAR.
   - **Division**: Which division owns and utilizes the asset (`PMG`, `TES`, or `AWS`).
   - **Depreciation Method**: Straight-line (typically 33.3% per year over 3 years for tech hardware).
4. Click **Save Asset**.

---

## Depreciation & Net Book Value (NBV)

The system automatically calculates the asset's current valuation:

```text
Net Book Value (NBV) = Purchase Price - Accumulated Depreciation
```

- Every monthly snapshot reflects updated book values on the company balance sheet.
- When an asset reaches the end of its useful life or is sold, you can record it as `Disposed` or `Written Off`.

---

## Luno Crypto Portfolio Integration

Under `/assets/luno`:

- Tracks company treasury allocations in Bitcoin and Ethereum.
- Pulls live market prices (ZAR) via API to calculate unrealized gains/losses.
- Provides real-time total net worth figures for monthly executive snapshots.
