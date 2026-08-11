# Grovi Delivery Pricing

For the separate server-authoritative serviceability policy, see [Delivery Zones](delivery-zones.md). When geographic enforcement is enabled, zone validation runs before routing; the existing 20 km limit remains a secondary operational constraint and pricing reuses the resolved route.

Status: Staging validated
Pricing version: `distance-bands-v1`

## 1. Overview

Grovi calculates delivery pricing from the driving route between:

- the selected `store_location` coordinates; and
- the customer's selected delivery-address coordinates.

The authoritative calculation runs server-side. The mobile client sends identifiers and a cart revision, but never supplies the delivery fee, distance, subtotal, or total used for charging.

Two trusted Appwrite operations are involved:

- `quote-delivery` calculates a pre-order quote for checkout review. It does not create an order.
- `place-order` independently reloads and validates the cart, address, inventory, store, and route, then calculates the final total and creates the order.

`place-order` does not trust an earlier quote because the cart, inventory, address, store configuration, or route result may have changed between review and commitment. The quote is informational; the order calculation is authoritative.

## 2. Architecture

```text
Customer selects address
        |
        v
Checkout Review (mobile)
        |
        | addressId + cartRevision only
        v
quote-delivery Function
        |
        +--> authenticated cart/address/store/inventory lookup
        |
        +--> shared checkout.js quoteOrder()
        |       |
        |       +--> DistanceProvider
        |               |
        |               v
        |          OSRM-compatible routing provider
        |
        +--> shared delivery-pricing.js
        |
        v
Quote: subtotal + delivery + total
        |
        v
Customer presses Place Order
        |
        v
place-order Function
        |
        +--> independently recalculates the same route pricing
        |
        +--> persists order and store-order metadata
        |
        v
Placed order
```

Both Functions use the `functions/place-order` source package. They have separate entrypoints so they share the exact same pricing implementation rather than maintaining two copies.

## 3. Source files and responsibilities

| File | Responsibility |
| --- | --- |
| `app/checkout/review.tsx` | Loads the selected address/cart state, requests quotes, renders loading/success/error states, and disables placement until the quote matches the current inputs. |
| `lib/checkout-service.ts` | Calls `quote-delivery` and `place-order` through Appwrite Functions; defines request/response types and checkout errors. |
| `functions/place-order/src/checkout.js` | Shared server checkout logic, including cart pricing, route pricing, quote generation, order totals, order creation, and idempotency. |
| `functions/place-order/src/delivery-pricing.js` | Central delivery bands, pricing version, maximum distance, coordinate validation, and meters-to-kilometres conversion. |
| `functions/place-order/src/distance-provider.js` | `DistanceProvider` implementation using an OSRM-compatible driving route API, timeout, and optional server-side authorization header. |
| `functions/place-order/src/main.js` | Authenticated `place-order` Function entrypoint and public error conversion. |
| `functions/place-order/src/quote-main.js` | Authenticated `quote-delivery` Function entrypoint and public error conversion. |
| `functions/calculate-distance/src/main.js` | Older store-distance utility using Haversine distance. It returns `deliveryFee: null` and is not used for authoritative checkout pricing. |
| `functions/place-order/test/checkout.test.js` | Checkout, quote, error, idempotency, revision, and persistence-oriented tests using a mocked repository/provider. |
| `functions/place-order/test/delivery-pricing.test.js` | Delivery-band boundary tests. |
| `lib/checkout-lifecycle.test.ts` | Client checkout-attempt/revision and submission lifecycle tests. |

## 4. Delivery pricing policy

`calculateDeliveryFeeJmdCents()` in `delivery-pricing.js` implements these bands:

| Driving distance | Delivery fee |
| --- | ---: |
| 0–3 km | JMD 300 |
| >3–6 km | JMD 500 |
| >6–10 km | JMD 700 |
| >10–12 km | JMD 900 |
| >12–14 km | JMD 1,000 |
| >14–16 km | JMD 1,100 |
| >16–18 km | JMD 1,200 |
| >18–20 km | JMD 1,300 |
| >20 km | Not deliverable |

The upper boundary of each band is inclusive. For example:

- `3.00 km` → JMD 300
- `3.01 km` → JMD 500
- `10.00 km` → JMD 700
- `10.01 km` → JMD 900
- `20.00 km` → JMD 1,300
- greater than `20 km` → `DELIVERY_OUT_OF_RANGE`

The current pricing version is `distance-bands-v1`. A future policy change should use a new version identifier rather than changing the meaning of historical order metadata.

## 5. Money representation

Grovi uses integer JMD cents/minor units in checkout. Floating-point currency values are not used for totals.

```text
JMD 300.00 = 30000 internal units
JMD 500.00 = 50000 internal units
```

The current checkout implementation has no additional platform fee or discount beyond `DISCOUNT_JMD_CENTS = 0`, so the calculated total is subtotal plus delivery fee.

## 6. Routing provider

`OsrmDistanceProvider` implements the server-side distance-provider contract:

```text
getDrivingDistance({
  origin: { latitude, longitude },
  destination: { latitude, longitude }
})
```

The origin is the store; the destination is the customer's address. The authoritative charge uses driving route distance, not Haversine or other straight-line distance.

The current configured endpoint is:

```text
https://router.project-osrm.org
```

This is suitable for current staging/development validation but is not Grovi's intended long-term production routing dependency. Production should use a managed/provider-backed routing service with an appropriate reliability, quota, and support model.

The request timeout defaults to `5000` ms. A routing HTTP error, malformed route response, or timeout becomes `DELIVERY_DISTANCE_UNAVAILABLE`; there is no default-fee fallback.

The routing provider may return fractional duration seconds. Before persistence, `checkout.js` rounds duration to whole seconds because Appwrite's duration attributes are integer fields. Route distance is rounded to whole metres.

The client never calls OSRM directly. An optional routing API key is read only by the server-side provider and is sent as a bearer token when configured.

## 7. Environment variables

The current Function variables are:

```env
GROVI_DATABASE_ID=grovi_staging
GROVI_ROUTING_PROVIDER_URL=https://router.project-osrm.org
GROVI_ROUTING_TIMEOUT_MS=5000
GROVI_ROUTING_API_KEY=
```

Both `place-order` and `quote-delivery` require these variables. `GROVI_ROUTING_API_KEY` is optional for the current public OSRM endpoint. No secret value is documented here.

## 8. Coordinate requirements

Coordinates are validated server-side:

- latitude must be between `-90` and `90`;
- longitude must be between `-180` and `180`.

Store coordinates are the `latitude` and `longitude` fields on `store_location`. The schema defines them as optional floats, but checkout requires usable values.

If store coordinates are missing, checkout returns `STORE_LOCATION_COORDINATES_MISSING`. This is a store configuration/data error; Grovi does not silently apply a default fee.

If customer coordinates are missing or invalid, checkout returns `INVALID_DELIVERY_LOCATION`. Grovi does not estimate pricing from parish names, textual addresses, or an address string.

## 9. Checkout quote lifecycle

Review requests a quote when the following are available:

- authenticated user;
- selected address with valid coordinates;
- non-empty cart; and
- checkout review is no longer loading addresses.

The client obtains the current checkout cart snapshot and sends its `updatedAt` as `cartRevision`. A quote is re-requested when the selected address changes, the cart revision changes, or the user taps Retry after a quote failure. Because the cart revision includes the cart's store/item state, relevant store changes also invalidate the quote.

Before placement, the review screen verifies that the quote's address and cart revision still match the current checkout snapshot. A stale quote is not used.

### Loading

Delivery displays `Calculating...`; the final total displays `—`; Place Order is disabled. The review does not show a temporary JMD 0 delivery fee.

### Success

The review displays the authoritative quote subtotal, delivery fee, total, and route distance.

### Routing unavailable

The customer sees a retryable message that delivery could not be calculated. Retry is available and Place Order remains disabled.

### Out of range

The customer is told that the address is outside Grovi's current delivery area. Place Order remains disabled.

### Missing coordinates

The existing valid-map-location address UX is used. No quote is requested and no price is invented.

## 10. Quote request and response

The mobile client calls `quote-delivery` with only:

```json
{
  "addressId": "...",
  "cartRevision": "..."
}
```

The Function loads the authoritative cart, inventory prices, products, stores, and address. Client-provided subtotal, fee, distance, and total are not accepted as pricing inputs.

The successful response uses these property names and JMD-cent values:

```json
{
  "ok": true,
  "data": {
    "addressId": "...",
    "cartRevision": "...",
    "subtotalJmdCents": 429900,
    "deliveryFeeJmdCents": 50000,
    "discountJmdCents": 0,
    "totalJmdCents": 479900,
    "deliveryDistanceMeters": 3272,
    "deliveryDurationSeconds": 315,
    "deliveryPricingVersion": "distance-bands-v1"
  }
}
```

`place-order` accepts its own checkout request and recalculates all of these values independently.

## 11. Multi-store behavior

Grovi's cart can contain products from multiple stores. The server:

1. identifies each distinct store in the priced cart;
2. requests one driving route from each store to the selected address;
3. applies the delivery band independently to each store route; and
4. sums the per-store delivery fees into the parent order total.

Each `store_order` receives its own delivery fee, route distance, and route duration. The parent `orders` record stores aggregate delivery distance and duration as the sums of the per-store values, plus the aggregate delivery fee.

## 12. Persisted order metadata

The repository schema defines these optional fields:

### `orders`

| Field | Type | Purpose |
| --- | --- | --- |
| `deliveryFeeJmdCents` | integer, required | Aggregate delivery charge. |
| `deliveryDistanceMeters` | integer, optional, minimum 0 | Aggregate route distance across stores. |
| `deliveryDurationSeconds` | integer, optional, minimum 0 | Aggregate rounded route duration across stores. |
| `deliveryPricingVersion` | string, optional, size 50 | Identifies the pricing-policy semantics used. |
| `totalJmdCents` | integer, required | Authoritative order total. |

### `store_orders`

| Field | Type | Purpose |
| --- | --- | --- |
| `deliveryFeeJmdCents` | integer, required | Per-store delivery charge. |
| `deliveryDistanceMeters` | integer, optional, minimum 0 | Route distance for that store. |
| `deliveryDurationSeconds` | integer, optional, minimum 0 | Rounded route duration for that store. |

Persisting this data supports charge auditing, support/debugging, historical pricing interpretation, and future analytics.

## 13. Idempotency and checkout revisions

`place-order` retains the existing checkout lifecycle:

- the client persists a checkout attempt containing address and cart revision;
- duplicate submissions use the same `clientRequestId`;
- a completed request is replayed instead of creating a second order;
- a reused idempotency key with different request data returns `IDEMPOTENCY_CONFLICT`;
- cart revision conflicts prevent checkout from using stale cart data;
- address changes cause the client to use a new material checkout attempt and request a new quote.

The quote operation does not create an order and does not weaken order-placement idempotency.

## 14. Errors and failure modes

| Error | Meaning | Review/order behavior |
| --- | --- | --- |
| `DELIVERY_OUT_OF_RANGE` | Driving route exceeds 20 km. | Customer sees an out-of-area message; placement is disabled. Retry is not useful until the address changes. |
| `DELIVERY_DISTANCE_UNAVAILABLE` | Routing provider failure, invalid route response, or timeout. | Customer sees a retry message; placement is disabled. |
| `STORE_LOCATION_COORDINATES_MISSING` | Store configuration lacks valid coordinates. | Internal/store issue; no default fee is charged. |
| `INVALID_DELIVERY_LOCATION` | Address coordinates are missing or outside valid ranges. | Customer must select/update a valid map location. |
| `CART_REVISION_CONFLICT` | Cart changed since the quote/request revision. | Quote is stale; the cart must be reloaded and repriced. |

Routing failure never falls back to an invented or default delivery fee.

## 15. Security model

- Delivery pricing is authoritative server-side.
- The mobile client cannot override delivery fee, route distance, subtotal, or total.
- `place-order` independently recalculates before creating the order.
- Routing endpoints and optional API keys are server-side Function configuration.
- Coordinates are range-validated before routing.
- Existing Appwrite authentication, user ownership checks, and repository authorization remain enforced.

## 16. Deployment notes

The current Appwrite configuration uses the verified Grovi staging project and defines:

| Function ID | Source path | Entrypoint |
| --- | --- | --- |
| `place-order` | `functions/place-order` | `src/main.js` |
| `quote-delivery` | `functions/place-order` | `src/quote-main.js` |

Both Function IDs intentionally use the same source package. Appwrite packages a Function from its configured source path; sharing this path ensures the quote and final order operations import the same `checkout.js`, `delivery-pricing.js`, and `distance-provider.js` modules.

The current deployment workflow uses a function-specific Appwrite CLI push, for example:

```bash
appwrite push functions --function-id place-order --force --activate true --with-variables
appwrite push functions --function-id quote-delivery --force --activate true --with-variables
```

> **Deployment warning:** During staging deployment, CLI variable synchronization resulted in missing Function variables. The variables had to be restored explicitly afterward. Until that workflow is improved, verify Function variables after every deployment before running checkout validation.

No schema migration is part of the Function deployment. The delivery metadata fields must already exist in the target database.

## 17. Staging verification

Known-good staging scenario:

- Store: PriceSmart Portmore
- Store coordinates: `17.959002, -76.889456`
- Destination area: Greater Portmore, St. Catherine
- Driving distance: `3.272 km`
- Duration: `315 seconds`
- Subtotal: JMD 4,299.00
- Delivery fee: JMD 500.00
- Total: JMD 4,799.00
- Pricing version: `distance-bands-v1`

`quote-delivery` returned these values before order placement. `place-order` independently returned the same fee, total, distance, duration, and pricing version. The persisted `orders` and `store_orders` records matched the response. A duplicate replay returned the same order with `idempotentReplay: true` and did not create another order.

No full customer address or other unnecessary personal information is included here.

## 18. Testing

Current automated validation:

- place-order and quote tests: 42 passing;
- checkout lifecycle tests: 7 passing;
- order service tests: 7 passing;
- TypeScript typecheck: passing;
- Expo lint: passing.

The tests cover pricing boundaries, mocked route responses, quote totals, stale revisions, missing customer/store coordinates, out-of-range routes, routing failures, client fee override rejection, authoritative order recalculation, partial-write recovery, and idempotent replay. The staging scenario additionally validated the real routing provider, quote-before-order behavior, persistence, cart reconciliation, and duplicate replay.

## 19. Maintenance guide

### Change delivery prices

1. Edit the centralized policy in `functions/place-order/src/delivery-pricing.js`.
2. Update the server pricing-boundary tests.
3. Bump `DELIVERY_PRICING_VERSION`.
4. Do not add pricing bands or fee formulas to mobile TypeScript.

### Change routing provider

1. Preserve the `DistanceProvider` contract.
2. Update the server Function configuration and provider adapter.
3. Keep credentials out of Expo/mobile code.
4. Test route distance, timeout, malformed response, and duration handling.

### Increase delivery radius

Change the centralized `MAX_DELIVERY_DISTANCE_KM`, update boundary/error tests, and evaluate driver economics and delivery margin before release.

## 20. Production readiness / known follow-ups

### Complete

- route-based server pricing;
- pre-order authoritative quote;
- independent final order recalculation;
- persisted delivery metadata;
- out-of-range handling;
- routing failure handling without fallback fees;
- checkout delivery/total display;
- idempotency and revision protection;
- staging verification.

### Follow-ups

- Replace the public OSRM endpoint with production-grade routing infrastructure/provider.
- Formalize Function environment-variable deployment and verification.
- Evaluate actual driver payout and Grovi delivery margin.
- Consider using route duration/traffic data for ETA or future pricing.

These follow-ups are not currently implemented.

## Change History

- 2026-08-08: Documented the staging-validated route-based delivery quote and authoritative order-pricing implementation, including the `distance-bands-v1` policy and Function deployment structure.
