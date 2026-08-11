import assert from "node:assert/strict";
import test from "node:test";
import { createDeliveryZoneConfig, DELIVERY_ZONE_ID, isValidZoneGeometry, loadPortmoreDeliveryZone, MAX_DELIVERY_DISTANCE_KM, validateDeliveryZone, validateDeliveryZoneLocation } from "../src/delivery-zone.js";

const store = { is_active: true, latitude: 18, longitude: -76.8 };
const address = { latitude: 18.01, longitude: -76.81 };
const route = (distanceMeters) => ({ distanceMeters, durationSeconds: 60 });
const portmorePolygon = {
  type: "Polygon",
  coordinates: [[[-76.90, 17.90], [-76.75, 17.90], [-76.75, 18.05], [-76.90, 18.05], [-76.90, 17.90]]],
};
const reviewedTestZone = createDeliveryZoneConfig({ geometry: portmorePolygon });

test("delivery zone accepts zero distance when geographic enforcement is disabled", () => {
  assert.deepEqual(validateDeliveryZone({ store, address, route: route(0), zone: createDeliveryZoneConfig({ enforcementEnabled: false }) }), { eligible: true, zoneId: undefined });
});

test("delivery zone accepts exactly 20 km inside the configured polygon", () => {
  assert.deepEqual(validateDeliveryZone({ store, address, route: route(MAX_DELIVERY_DISTANCE_KM * 1000), zone: reviewedTestZone }), { eligible: true, zoneId: DELIVERY_ZONE_ID });
});

test("delivery zone rejects just over 20 km after geographic eligibility", () => {
  assert.deepEqual(validateDeliveryZone({ store, address, route: route(20000.001), zone: reviewedTestZone }), { eligible: false, reason: "delivery_out_of_range" });
});

test("point-in-polygon uses GeoJSON longitude/latitude ordering", () => {
  assert.equal(validateDeliveryZoneLocation({ customerLocation: { latitude: 17.95, longitude: -76.88 }, zone: reviewedTestZone }).eligible, true);
  assert.equal(validateDeliveryZoneLocation({ customerLocation: { latitude: -76.88, longitude: 17.95 }, zone: reviewedTestZone }).reason, "outside_service_area");
});

test("polygon edge and vertex are eligible", () => {
  assert.equal(validateDeliveryZoneLocation({ customerLocation: { latitude: 17.90, longitude: -76.88 }, zone: reviewedTestZone }).eligible, true);
  assert.equal(validateDeliveryZoneLocation({ customerLocation: { latitude: 17.90, longitude: -76.90 }, zone: reviewedTestZone }).eligible, true);
});

test("outside geographic area is rejected before route validation", () => {
  const result = validateDeliveryZoneLocation({ customerLocation: { latitude: 17.95, longitude: -76.91 }, zone: reviewedTestZone });
  assert.deepEqual(result, { eligible: false, reason: "outside_service_area" });
});

test("invalid geometry fails safely and missing geometry is not silently enabled", () => {
  assert.equal(isValidZoneGeometry({ type: "Polygon", coordinates: [[[1, 2], [3, 4]]] }), false);
  assert.equal(createDeliveryZoneConfig({ geometry: { type: "Polygon", coordinates: [] } }).status, "unavailable");
  assert.equal(loadPortmoreDeliveryZone({ env: { GROVI_ENFORCE_GEOGRAPHIC_ZONES: "true" }, readFile: () => { throw new Error("missing"); } }).status, "unavailable");
  assert.equal(loadPortmoreDeliveryZone({ env: {}, readFile: () => { throw new Error("missing"); } }).status, "disabled");
});

test("delivery zone rejects missing or invalid coordinates", () => {
  assert.equal(validateDeliveryZone({ store: { ...store, latitude: undefined }, address, route: route(0) }).reason, "store_coordinates_invalid");
  assert.equal(validateDeliveryZone({ store, address: { ...address, latitude: undefined }, route: route(0) }).reason, "customer_coordinates_invalid");
  assert.equal(validateDeliveryZone({ store: { ...store, latitude: 91 }, address, route: route(0) }).reason, "store_coordinates_invalid");
  assert.equal(validateDeliveryZone({ store, address: { ...address, longitude: -181 }, route: route(0) }).reason, "customer_coordinates_invalid");
});

test("delivery zone requires an active store and valid route", () => {
  assert.equal(validateDeliveryZone({ store: { ...store, is_active: false }, address, route: route(0) }).reason, "store_inactive");
  assert.equal(validateDeliveryZone({ store, address, route: { distanceMeters: NaN } }).reason, "route_invalid");
});
