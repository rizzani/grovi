/**
 * Jamaica Parishes - Complete list of all 14 parishes
 */
export const JAMAICA_PARISHES = [
  "Kingston & St. Andrew",
  "St. Catherine",
  "Clarendon",
  "Manchester",
  "St. Elizabeth",
  "Westmoreland",
  "Hanover",
  "St. James",
  "Trelawny",
  "St. Ann",
  "St. Mary",
  "Portland",
  "St. Thomas",
] as const;

export type JamaicaParish = typeof JAMAICA_PARISHES[number];

/**
 * Validates if a string is a valid Jamaica parish
 */
export function isValidJamaicaParish(parish: string): boolean {
  return JAMAICA_PARISHES.includes(parish as JamaicaParish);
}
