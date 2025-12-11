type JsonObject = Record<string, unknown>;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

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

// Example usage:

/*
import fs from "fs";

const rulesSchema = JSON.parse(fs.readFileSync("src/schemas/rules.json", "utf-8"));
const questionMap: Record<string, any> = {
  Q1: { type: "TEXT", description: "Explain..." },
  Q2: { type: "NUMERIC", description: "Enter a number..." },
  Q3: { type: "CHOICE", options: ["A", "B"] },
  Q4: { type: "MULTI_VALUED", config: { delimiter: "," } },
};

const updated = augmentRulesSchemaWithQuestionIdEnums(rulesSchema, questionMap);
console.log(JSON.stringify(updated, null, 2));
*/