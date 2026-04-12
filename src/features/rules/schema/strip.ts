/** Keys that are engine-computed metadata and should never appear in RJSF forms. */
const ENGINE_KEYS = ['question_types', 'constraints'] as const;

/**
 * Properties whose `const` and `readOnly` attributes must be stripped.
 *
 * RJSF's `sanitizeDataForNewSchema` sets `const`/`readOnly` properties to
 * undefined during oneOf transitions (deselect → reselect). Keeping only
 * `default` lets `getDefaultFormState` populate the value correctly while the
 * field stays hidden via HiddenAwareFieldTemplate.
 *
 * - `type` — the rule discriminator (e.g. "TEXT_MATCH", "PROGRAMMABLE")
 * - `dtype` — the parameter discriminator (e.g. "Int", "Float", "String")
 */
const DISCRIMINATOR_PROPS = ['type', 'dtype'] as const;

/**
 * Strips engine-computed metadata keys and sanitises discriminator properties
 * in every definition in the schema.
 */
export function stripEngineKeysFromRulesSchema<T extends Record<string, unknown>>(
  schema: T,
  engineKeys: readonly string[] = ENGINE_KEYS,
): T {
  const cloned: T = JSON.parse(JSON.stringify(schema));

  const container: Record<string, unknown> =
    (cloned as { definitions?: Record<string, unknown> }).definitions &&
    typeof (cloned as { definitions?: Record<string, unknown> }).definitions === 'object'
      ? (cloned as { definitions?: Record<string, unknown> }).definitions!
      : (cloned as Record<string, unknown>);

  Object.values(container).forEach((def) => {
    if (!def || typeof def !== 'object') return;

    const defObj = def as { properties?: Record<string, unknown>; required?: unknown[] } & Record<string, unknown>;

    if (defObj.properties && typeof defObj.properties === 'object') {
      engineKeys.forEach((k) => {
        if (k in defObj.properties!) {
          delete defObj.properties![k];
        }
      });

      for (const key of DISCRIMINATOR_PROPS) {
        const prop = defObj.properties[key];
        if (prop && typeof prop === 'object') {
          const p = prop as Record<string, unknown>;
          delete p['const'];
          delete p['readOnly'];
        }
      }
    }

    if (Array.isArray(defObj.required)) {
      defObj.required = defObj.required.filter(
        (r) => typeof r === 'string' && !engineKeys.includes(r),
      );
    }
  });

  return cloned;
}