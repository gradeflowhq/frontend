import { ENGINE_KEYS } from '../constants';

export function stripEngineKeysFromRulesSchema<T extends Record<string, unknown>>(
  schema: T,
  engineKeys: readonly string[] = ENGINE_KEYS
): T {
  // Deep clone to avoid mutating the original object
  const cloned: T = JSON.parse(JSON.stringify(schema));

  // The rules definitions may either be under "definitions" or at the root.
  const container: Record<string, unknown> =
    (cloned as { definitions?: Record<string, unknown> }).definitions &&
    typeof (cloned as { definitions?: Record<string, unknown> }).definitions === 'object'
      ? (cloned as { definitions?: Record<string, unknown> }).definitions!
      : (cloned as Record<string, unknown>);

  // Iterate through each definition and remove ENGINE_KEYS from its "properties" and "required"
  Object.values(container).forEach((def) => {
    if (!def || typeof def !== 'object') return;

    const defObj = def as { properties?: Record<string, unknown>; required?: unknown[] } & Record<string, unknown>;

    // Remove from properties
    if (defObj.properties && typeof defObj.properties === 'object') {
      engineKeys.forEach((k) => {
        if (k in defObj.properties!) {
          delete defObj.properties![k];
        }
      });
    }

    // Remove from required
    if (Array.isArray(defObj.required)) {
      defObj.required = defObj.required.filter((r) => typeof r === 'string' && !engineKeys.includes(r));
    }

    // If defaults for those keys exist at the same level, clean them too (rare but safe)
    engineKeys.forEach((k) => {
      if (k in defObj) {
        delete defObj[k];
      }
    });
  });

  return cloned;
}

// Example:
// const cleanedSchema = stripEngineKeysFromRulesSchema(rulesJsonSchema);