import { ENGINE_KEYS } from '../constants';

type JSONValue = null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue };

export function stripEngineKeysFromRulesSchema<T extends Record<string, any>>(
  schema: T,
  engineKeys: readonly string[] = ENGINE_KEYS
): T {
  // Deep clone to avoid mutating the original object
  const cloned: T = JSON.parse(JSON.stringify(schema));

  // The rules definitions may either be under "definitions" or at the root.
  const container: Record<string, any> =
    (cloned as any).definitions && typeof (cloned as any).definitions === 'object'
      ? (cloned as any).definitions
      : (cloned as any);

  // Iterate through each definition and remove ENGINE_KEYS from its "properties" and "required"
  Object.values(container).forEach((def: any) => {
    if (!def || typeof def !== 'object') return;

    // Remove from properties
    if (def.properties && typeof def.properties === 'object') {
      engineKeys.forEach((k) => {
        if (k in def.properties) {
          delete def.properties[k];
        }
      });
    }

    // Remove from required
    if (Array.isArray(def.required)) {
      def.required = def.required.filter((r: string) => !engineKeys.includes(r));
    }

    // If defaults for those keys exist at the same level, clean them too (rare but safe)
    engineKeys.forEach((k) => {
      if (k in def) {
        delete def[k];
      }
    });
  });

  return cloned;
}

// Example:
// const cleanedSchema = stripEngineKeysFromRulesSchema(rulesJsonSchema);