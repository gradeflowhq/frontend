/** Keys that are engine-computed metadata and should never appear in RJSF forms. */
const ENGINE_KEYS = ['question_types', 'constraints'] as const;

/**
 * Properties whose `const` attribute must be converted to `enum` and whose
 * `readOnly` attribute must be stripped.
 *
 * Converting `const` → `enum: [value]` rather than deleting it allows
 * RJSF's `getOptionMatchingSimpleDiscriminator` to identify the correct
 * oneOf option immediately, bypassing the slow and fragile validation +
 * scoring fallback.  Stripping `readOnly` lets `getDefaultFormState`
 * populate the value correctly while the field stays hidden via
 * HiddenAwareFieldTemplate.
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
          // Convert const → enum so getOptionMatchingSimpleDiscriminator can
          // still match while sanitizeDataForNewSchema no longer treats the
          // property as an immutable constant.
          if ('const' in p) {
            p['enum'] = [p['const']];
            delete p['const'];
          }
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