/**
 * Deep-clone a JSON-serialisable value via JSON round-trip.
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
