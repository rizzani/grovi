# Grovi Delivery Zones

## Current status

The candidate `portmore-v1.geojson` is installed and approved as Grovi's MVP operational service area. Geographic enforcement is enabled for the checkout Functions.

The current active policy remains the existing operational route rule:

```text
valid store/address coordinates
        ↓
authoritative driving route <= 20 km
        ↓
eligible
```

No rectangular approximation, parish-name rule, or fabricated Portmore polygon is used.

## Why radius-only validation is insufficient

The 20 km rule measures travel from a store and can include locations outside Portmore, including parts of Spanish Town. It is an operational delivery safeguard, not the definition of Grovi's geographic service area.

The intended policy is:

```text
customer point inside portmore-v1
        AND
driving route <= 20 km
        AND
store/address/routing data valid
```

`portmore-v1` represents Grovi's MVP operational Portmore service area. It is not a legal definition or claim about Portmore parish or municipal boundaries.

Hellshire is intentionally excluded from `portmore-v1` for the MVP. Future expansion must use a separately reviewed zone version, such as `portmore-v2`, rather than silently changing the historical meaning of `portmore-v1`.

## Architecture

The shared Function pipeline is:

```text
load authoritative cart/address/stores
        ↓
validate coordinates
        ↓
load configured zone
        ↓
if geographic enforcement is enabled:
  point-in-polygon check
        ↓
outside → OUTSIDE_SERVICE_AREA, no routing call
        ↓
resolve one driving route per distinct store/address pair
        ↓
validate 20 km operational cap
        ↓
calculate delivery pricing from the same route
```

Both `quote-delivery` and `place-order` use the same `checkout.js` and `delivery-zone.js` logic. `place-order` independently performs the checks again; the client cannot assert zone eligibility.

The point-in-polygon code is server-local and uses Turf's established `@turf/boolean-point-in-polygon` package. GeoJSON coordinates are ordered `[longitude, latitude]`; Grovi address objects are ordered `{ latitude, longitude }`. The adapter explicitly converts between them.

Points on a polygon edge or vertex are treated as eligible. This is also covered by tests.

## Geometry configuration

The expected reviewed geometry file is:

```text
functions/place-order/src/zones/portmore-v1.geojson
```

The loader accepts a GeoJSON `Polygon`, `MultiPolygon`, `Feature`, or single-feature `FeatureCollection`. It validates that rings are closed and contain usable numeric coordinates.

The file is currently absent by design. Until it is supplied, the default configuration is:

```env
GROVI_ENFORCE_GEOGRAPHIC_ZONES=false
```

If `GROVI_ENFORCE_GEOGRAPHIC_ZONES=true` while the file is missing or invalid, checkout fails safely with retryable `DELIVERY_ZONE_UNAVAILABLE`; it does not fall back to a guessed boundary and does not call routing.

The approved zone is enabled with:

1. keep the reviewed `portmore-v1.geojson` file version-controlled;
2. keep `GROVI_ENFORCE_GEOGRAPHIC_ZONES=true` in both deployed checkout Functions;
3. verify Function variables after deployment; and
4. run the known Portmore, Spanish Town, and Hellshire validation requests.

## Error semantics

- `OUTSIDE_SERVICE_AREA`: valid customer coordinates are outside `portmore-v1`; non-retryable until the address changes.
- `DELIVERY_OUT_OF_RANGE`: the customer is geographically eligible, but a store route exceeds 20 km; non-retryable until the address changes.
- `DELIVERY_DISTANCE_UNAVAILABLE`: routing failed or returned malformed data; retryable.
- `DELIVERY_ZONE_UNAVAILABLE`: geographic enforcement is enabled but zone geometry is missing/invalid; retryable operational configuration error.
- `INVALID_DELIVERY_LOCATION`: customer coordinates are missing or invalid.
- `STORE_LOCATION_COORDINATES_MISSING`: required store coordinates are missing or invalid.

## Multi-store behavior

The customer must pass the geographic zone check, and every required store must pass the 20 km operational route check. The checkout resolves one route per distinct store and rejects the complete quote/order if any store cannot serve the address. Partial checkout is not supported.

## Boundary source and confidence

The repository now contains the uploaded candidate machine-readable geometry at `functions/place-order/src/zones/portmore-v1.geojson`.

The candidate review sources are:

- Jamaica National Land Agency material, including the 2024 government-gazetted “Map Delineating Project Area of All of Portmore, Saint Catherine”.
- Portmore Municipal Council's published Portmore municipality map.

The installed geometry was supplied separately and was not redrawn or simplified. It is Grovi's approved MVP operational delivery boundary, not a legal parish boundary. Hellshire is intentionally outside this MVP zone.

## Staging expectations

The known Portmore test point remains:

- PriceSmart Portmore: `17.959002, -76.889456`
- Greater Portmore test coordinates: `17.93708317582, -76.896413359791`
- known route: approximately `3.272 km`
- expected route fee: JMD 500

The candidate confirms both known Portmore points inside `portmore-v1`, and central Spanish Town and Hellshire controls outside it. Quote/order requests reject outside controls with `OUTSIDE_SERVICE_AREA` before making a routing call. Community checks include Braeton, Greater Portmore, Bridgeport, Waterford, Independence City, Edgewater, Naggo Head, Passage Fort, and Gregory Park. Hellshire Beach and Hellshire Heights are intentionally excluded for MVP.

## Future zones

The zone loader and validator are structured around zone configuration rather than Portmore-specific point-in-polygon logic. Future reviewed files can add zones such as `spanish-town-v1` or `kingston-v1`, followed later by explicit store-to-zone assignments. No database-backed assignment is required for the current Portmore-only rollout.
