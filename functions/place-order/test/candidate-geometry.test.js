import assert from "node:assert/strict";
import test from "node:test";
import { loadPortmoreDeliveryZone, validateDeliveryZoneLocation } from "../src/delivery-zone.js";

const zone = loadPortmoreDeliveryZone({ env: { GROVI_ENFORCE_GEOGRAPHIC_ZONES: "true" } });

const points = {
  priceSmart: { latitude: 17.959002, longitude: -76.889456 },
  greaterPortmore: { latitude: 17.93708317582, longitude: -76.896413359791 },
  spanishTown: { latitude: 17.9957, longitude: -76.9574 },
};

test("installed candidate geometry loads as portmore-v1", () => {
  assert.equal(zone.status, "ready");
  assert.equal(zone.id, "portmore-v1");
  assert.equal(zone.geometry.type, "Polygon");
});

test("known Grovi Portmore points are inside the candidate zone", () => {
  assert.equal(validateDeliveryZoneLocation({ customerLocation: points.priceSmart, zone }).zoneId, "portmore-v1");
  assert.equal(validateDeliveryZoneLocation({ customerLocation: points.greaterPortmore, zone }).zoneId, "portmore-v1");
});

test("central Spanish Town control is outside the candidate zone", () => {
  assert.deepEqual(validateDeliveryZoneLocation({ customerLocation: points.spanishTown, zone }), { eligible: false, reason: "outside_service_area" });
});
