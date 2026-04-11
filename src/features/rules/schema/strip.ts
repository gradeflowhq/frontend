/** Keys that are engine-computed metadata and should never appear in RJSF forms. */
const ENGINE_KEYS = ['question_types', 'constraints'] as const;

/**
 * Strips engine-computed metadata keys from every rule definition in the schema.
 * This removes fields like `question_types` and `constraints` that are set by
 * the engine and should not be editable by the user.
 *
 * Fields like `type` and `name` are NOT stripped — they stay in the schema
 * (hidden via the field template) so RJSF can use them for discriminator
 * matching and form-data initialisation.
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

      // Strip `const` and `readOnly` from the `type` property.
      // RJSF's sanitizeDataForNewSchema sets properties with `const` or
      // `readOnly` to undefined during oneOf transitions when oldSchema is
      // absent (deselect → reselect). Keeping only `default` lets
      // getDefaultFormState populate the value correctly while the field
      // stays hidden via HiddenAwareFieldTemplate.
      const typeProp = defObj.properties['type'];
      if (typeProp && typeof typeProp === 'object') {
        const tp = typeProp as Record<string, unknown>;
        delete tp['const'];
        delete tp['readOnly'];
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