import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

export const MAX_DELIVERY_DISTANCE_KM = 20;
export const PORTMORE_ZONE_ID = "portmore-v1";
export const DELIVERY_ZONE_ID = PORTMORE_ZONE_ID;

const PORTMORE_ZONE_FILE = fileURLToPath(new URL("./zones/portmore-v1.geojson", import.meta.url));

export function validateCoordinates(value) {
  return value && Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude))
    && Number(value.latitude) >= -90 && Number(value.latitude) <= 90
    && Number(value.longitude) >= -180 && Number(value.longitude) <= 180;
}

function isPosition(value) {
  return Array.isArray(value) && value.length >= 2
    && Number.isFinite(Number(value[0])) && Number(value[0]) >= -180 && Number(value[0]) <= 180
    && Number.isFinite(Number(value[1])) && Number(value[1]) >= -90 && Number(value[1]) <= 90;
}

function isRing(value) {
  return Array.isArray(value) && value.length >= 4
    && value.every(isPosition)
    && value[0][0] === value[value.length - 1][0]
    && value[0][1] === value[value.length - 1][1];
}

function isPolygonGeometry(value) {
  return value?.type === "Polygon"
    && Array.isArray(value.coordinates)
    && value.coordinates.length > 0
    && value.coordinates.every(isRing);
}

function isMultiPolygonGeometry(value) {
  return value?.type === "MultiPolygon"
    && Array.isArray(value.coordinates)
    && value.coordinates.length > 0
    && value.coordinates.every((polygon) => Array.isArray(polygon) && polygon.length > 0 && polygon.every(isRing));
}

function geometryFromGeoJson(document) {
  if (document?.type === "Feature") return document.geometry;
  if (document?.type === "FeatureCollection" && document.features?.length === 1) return document.features[0]?.geometry;
  return document;
}

export function isValidZoneGeometry(geometry) {
  return isPolygonGeometry(geometry) || isMultiPolygonGeometry(geometry);
}

export function createDeliveryZoneConfig({ id = PORTMORE_ZONE_ID, geometry, enforcementEnabled = true, source = "review-required" } = {}) {
  if (!enforcementEnabled) return { id, enforcementEnabled: false, geometry: null, source, status: "disabled" };
  if (!isValidZoneGeometry(geometry)) return { id, enforcementEnabled: true, geometry: null, source, status: "unavailable" };
  return { id, enforcementEnabled: true, geometry, source, status: "ready" };
}

export function loadPortmoreDeliveryZone({ env = process.env, readFile = (path) => readFileSync(path, "utf8"), filePath = PORTMORE_ZONE_FILE } = {}) {
  const enforcementEnabled = String(env.GROVI_ENFORCE_GEOGRAPHIC_ZONES || "false").toLowerCase() === "true";
  if (!enforcementEnabled) return createDeliveryZoneConfig({ enforcementEnabled: false, source: filePath });
  try {
    const document = JSON.parse(readFile(filePath));
    return createDeliveryZoneConfig({ geometry: geometryFromGeoJson(document), enforcementEnabled: true, source: filePath });
  } catch {
    return createDeliveryZoneConfig({ enforcementEnabled: true, source: filePath });
  }
}

export function validateDeliveryZoneLocation({ customerLocation, zone }) {
  if (!validateCoordinates(customerLocation)) return { eligible: false, reason: "customer_coordinates_invalid" };
  if (!zone?.enforcementEnabled) return { eligible: true, zoneId: undefined };
  if (zone.status !== "ready" || !isValidZoneGeometry(zone.geometry)) {
    return { eligible: false, reason: "zone_configuration_unavailable" };
  }
  try {
    // GeoJSON uses [longitude, latitude]; Grovi locations use latitude/longitude.
    const point = { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [Number(customerLocation.longitude), Number(customerLocation.latitude)] } };
    const polygon = { type: "Feature", properties: {}, geometry: zone.geometry };
    return booleanPointInPolygon(point, polygon)
      ? { eligible: true, zoneId: zone.id }
      : { eligible: false, reason: "outside_service_area" };
  } catch {
    return { eligible: false, reason: "zone_configuration_unavailable" };
  }
}

/**
 * Evaluates serviceability from an already-resolved authoritative driving route.
 * This module deliberately has no routing-provider dependency.
 */
export function validateDeliveryZone({ store, address, route, zone, maxDistanceKm = MAX_DELIVERY_DISTANCE_KM }) {
  if (!store || store.is_active !== true) return { eligible: false, reason: "store_inactive" };
  if (!validateCoordinates(store)) return { eligible: false, reason: "store_coordinates_invalid" };
  const location = validateDeliveryZoneLocation({ customerLocation: address, zone });
  if (!location.eligible) return location;
  if (!route || !Number.isFinite(route.distanceMeters) || route.distanceMeters < 0) {
    return { eligible: false, reason: "route_invalid" };
  }
  if (route.distanceMeters / 1000 > maxDistanceKm) return { eligible: false, reason: "delivery_out_of_range" };
  return { eligible: true, zoneId: location.zoneId };
}
