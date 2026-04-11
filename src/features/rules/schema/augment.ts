import { friendlyRuleLabel } from './lookup';
import { deepClone } from './utils';

type JsonObject = Record<string, unknown>;

const UNSELECTED_RULE_TITLE = 'Select a rule\u2026';

/**
 * Extracts a question's type string from its schema/instance.
 */
function extractQuestionType(questionSchema: JsonObject): string | null {
  const t = (questionSchema as Record<string, unknown>)?.type;
  if (typeof t === "string") return t;
  if (t && typeof t === "object" && !Array.isArray(t)) {
    const defaultVal = (t as { default?: unknown }).default;
    if (typeof defaultVal === "string") return defaultVal;
  }
  return null;
}

/**
 * Extracts rule-compatible types from the rule definition using question_types only.
 */
function extractRuleCompatibleTypes(ruleDef: JsonObject): string[] {
  const props = (ruleDef as { properties?: Record<string, unknown> })?.properties ?? {};
  const qt = (props as Record<string, unknown>).question_types;
  if (qt && typeof qt === "object" && !Array.isArray(qt)) {
    const defaults = (qt as { default?: unknown }).default;
    const enums = (qt as { enum?: unknown }).enum;
    const vals = Array.isArray(defaults) ? defaults : Array.isArray(enums) ? enums : undefined;
    if (Array.isArray(vals) && vals.every((v) => typeof v === "string")) return vals.slice();
  }
  return [];
}

/**
 * Adds a `title` field to every definition that is missing one.
 * This makes RJSF's oneOf selector show human-readable labels instead of
 * raw definition key names like "AssumptionSetQuestionRule".
 */
export function augmentRulesSchemaWithTitles(rulesSchema: JsonObject): JsonObject {
  const updated = deepClone(rulesSchema);
  for (const [key, def] of Object.entries(updated)) {
    if (!def || typeof def !== "object") continue;
    // Always override with a friendly label — the raw JSON schema titles are
    // just the definition key names (e.g. "TextMatchQuestionRule") which are
    // not user-facing. Overriding ensures RJSF oneOf selectors show readable names.
    (def as Record<string, unknown>).title = friendlyRuleLabel(key);
  }
  return updated;
}

/**
 * Filters `oneOf` arrays in nested rule fields to only include rule definitions
 * compatible with the given question type. This prevents the RJSF form from
 * listing incompatible rule types in nested rule selectors.
 *
 * Works generically: for every property in every definition, if the property
 * has a `oneOf` (directly or via `items.oneOf` for array types), filter its
 * entries by question-type compatibility. This covers both array fields
 * (e.g. `if_rules`, `then_rules`, `rules`) and single-object fields (e.g. `rule`
 * inside the `Assumption` definition).
 *
 * @param rulesSchema  The (possibly already-augmented) top-level rules schema object.
 * @param questionType The question type to filter against (e.g. "TEXT", "NUMERIC").
 */
export function filterNestedRuleOneOfByQuestionType(
  rulesSchema: JsonObject,
  questionType: string | null | undefined
): JsonObject {
  if (!questionType) return rulesSchema;

  const updated = deepClone(rulesSchema);

  /**
   * Returns true if the $ref entry is compatible with the given question type.
   * Rules with an empty question_types list are considered universal (kept).
   */
  const isCompatible = (entry: unknown): boolean => {
    if (!entry || typeof entry !== "object") return true;
    const ref = (entry as { $ref?: string }).$ref;
    if (!ref) return true;

    // Extract definition name from $ref like "#/definitions/TextMatchQuestionRule"
    // or the flat schema case "#/TextMatchRule"
    const defName = ref.split('/').pop();
    if (!defName) return true;

    const refDef = (updated as Record<string, unknown>)[defName];
    if (!refDef || typeof refDef !== "object") return true;

    const compatibleTypes = extractRuleCompatibleTypes(refDef as JsonObject);
    if (compatibleTypes.length === 0) return true;
    return compatibleTypes.includes(questionType);
  };

  /**
   * Filters a oneOf array in-place and removes the discriminator (if any)
   * to prevent RJSF from mis-selecting a schema.
   */
  const filterOneOf = (container: Record<string, unknown>): void => {
    const oneOf = container.oneOf;
    if (!Array.isArray(oneOf)) return;
    container.oneOf = oneOf.filter(isCompatible);
    delete container.discriminator;
  };

  for (const [, defSchema] of Object.entries(updated)) {
    if (!defSchema || typeof defSchema !== "object") continue;
    const props = (defSchema as { properties?: JsonObject }).properties ?? {};
    if (!props || typeof props !== "object") continue;

    for (const [, fieldSchema] of Object.entries(props as Record<string, unknown>)) {
      if (!fieldSchema || typeof fieldSchema !== "object") continue;
      const field = fieldSchema as Record<string, unknown>;

      // Case 1: array field with items.oneOf  (e.g. if_rules, then_rules, rules)
      const items = field.items;
      if (items && typeof items === "object") {
        filterOneOf(items as Record<string, unknown>);
      }

      // Case 2: single-object field with direct oneOf (e.g. `rule` in Assumption)
      filterOneOf(field);
    }
  }

  return updated;
}

/**
 * Produces a modified rules schema where each definition that has a 'question_id'
 * property gets its 'enum' set to the list of compatible question IDs.
 *
 * Compatibility: a rule is compatible with a question if
 * rule.question_types contains question.type.
 */
export function augmentRulesSchemaWithQuestionIdEnums(
  rulesSchema: JsonObject,
  questionIdToSchema: Record<string, JsonObject>
): JsonObject {
  const updated = deepClone(rulesSchema);

  // Pre-compute question_id -> type
  const questionTypeMap: Record<string, string | null> = {};
  for (const [qid, qschema] of Object.entries(questionIdToSchema)) {
    questionTypeMap[qid] = extractQuestionType(qschema);
  }

  // Iterate over each definition in the rules schema (top-level keys represent definitions)
  for (const [defName, defSchema] of Object.entries(updated)) {
    if (!defSchema || typeof defSchema !== "object") continue;

    const props: JsonObject = (defSchema as { properties?: JsonObject }).properties ?? {};
    if (!props || typeof props !== "object") continue;

    // Only process if definition has a 'question_id' property
    if (!("question_id" in props)) continue;

    // Determine rule-compatible types (from question_types only)
    const compatibleTypes = extractRuleCompatibleTypes(defSchema as JsonObject);

    // Build compatible question IDs
    const compatibleQids: string[] = [];
    for (const [qid, qtype] of Object.entries(questionTypeMap)) {
      if (qtype && compatibleTypes.includes(qtype)) {
        compatibleQids.push(qid);
      }
    }

    // Set enum for question_id
    const qidProp = props["question_id"] as JsonObject | undefined;
    if (qidProp && typeof qidProp === "object") {
      (qidProp as { enum?: string[] }).enum = compatibleQids;
    } else {
      props["question_id"] = {
        type: "string",
        title: "Question Id",
        enum: compatibleQids,
      };
    }

    // Write back updated properties
    (defSchema as { properties?: JsonObject }).properties = props;
    updated[defName] = defSchema;
  }

  return updated;
}

/**
 * Schema for the "unselected" placeholder that RJSF shows as the first oneOf
 * option.  It is a plain empty object – if the user saves without choosing a
 * real rule the backend validation rejects it.
 */
const UNSELECTED_PLACEHOLDER: JsonObject = Object.freeze({
  type: 'object',
  title: UNSELECTED_RULE_TITLE,
  properties: {},
  additionalProperties: false,
});

/**
 * Prepends an "unselected" placeholder to every nested rule `oneOf` so that
 * newly created items (e.g. a new Assumption) default to "Select a rule…"
 * instead of auto-selecting the first real rule type.
 */
export function prependUnselectedPlaceholderToNestedOneOf(
  rulesSchema: JsonObject,
): JsonObject {
  const updated = deepClone(rulesSchema);

  const prependPlaceholder = (container: Record<string, unknown>): void => {
    const oneOf = container.oneOf;
    if (!Array.isArray(oneOf) || oneOf.length === 0) return;
    // Avoid double-prepending
    const first = oneOf[0] as JsonObject | undefined;
    if (first?.title === UNSELECTED_RULE_TITLE) return;
    container.oneOf = [{ ...UNSELECTED_PLACEHOLDER }, ...oneOf];
  };

  for (const [, defSchema] of Object.entries(updated)) {
    if (!defSchema || typeof defSchema !== 'object') continue;
    const props = (defSchema as { properties?: JsonObject }).properties ?? {};
    if (!props || typeof props !== 'object') continue;

    for (const [, fieldSchema] of Object.entries(props as Record<string, unknown>)) {
      if (!fieldSchema || typeof fieldSchema !== 'object') continue;
      const field = fieldSchema as Record<string, unknown>;

      // Array field with items.oneOf (e.g. if_rules, then_rules, rules)
      const items = field.items;
      if (items && typeof items === 'object') {
        prependPlaceholder(items as Record<string, unknown>);
      }

      // Single-object field with direct oneOf (e.g. `rule` in Assumption)
      prependPlaceholder(field);
    }
  }

  return updated;
}
