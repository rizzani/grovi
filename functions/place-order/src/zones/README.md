# Delivery-zone boundary data

`portmore-v1.geojson` is the installed candidate Grovi Portmore operational delivery zone. Its coordinates are preserved from the uploaded source and must not be redrawn automatically.

Before enabling `GROVI_ENFORCE_GEOGRAPHIC_ZONES=true`, review the installed GeoJSON `Polygon` or `MultiPolygon` at:

```text
functions/place-order/src/zones/portmore-v1.geojson
```

Coordinates must use GeoJSON ordering: `[longitude, latitude]`. The geometry should be extracted from a reviewed Portmore operational service-area source and independently checked against known Portmore and Spanish Town test points.

Until the candidate is approved for Grovi operations, the loader/configuration keeps geographic enforcement disabled and the existing 20 km operational route limit remains active.
