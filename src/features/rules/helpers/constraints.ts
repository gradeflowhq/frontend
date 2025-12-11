type JsonObject = Record<string, unknown>;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function toEnumValues(value: unknown): string[] {
  // Normalize the source into an array of strings suitable for enum.
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : String(v)))
      .filter((v) => v.length > 0);
  }
  // If the source isn't an array, attempt to turn it into a single enum value.
  if (value !== undefined && value !== null) {
    return [String(value)];
  }
  return [];
}

/**
 * Injects enums into rule properties based on constraints for a specific question_id.
 *
 * For each rule in the schema:
 *  - For each constraint in rule.constraints (from constraints.default):
 *    - Take constraint.source from the question schema for the given question_id
 *    - Inject those values into enums of rule[constraint.target]:
 *        - If rule.properties[target] is an array: set items.enum
 *        - Else: set property.enum
 */
export function injectEnumsFromConstraintsForQuestion(
  rulesSchema: JsonObject,
  questionIdToSchema: Record<string, JsonObject>,
  questionId: string
): JsonObject {
  const updated = deepClone(rulesSchema);

  const questionSchema = questionIdToSchema[questionId];
  if (!questionSchema) {
    // If the question_id isn't found, return the original (cloned) schema unchanged.
    return updated;
  }

  // Iterate through rule definitions in the rules schema
  for (const [defName, defSchema] of Object.entries(updated)) {
    if (!defSchema || typeof defSchema !== "object") continue;

    const props: JsonObject = (defSchema as { properties?: JsonObject }).properties ?? {};
    if (!props || typeof props !== "object") continue;

    // Constraints are defined as a schema, but may have a concrete default array we can use.
    const constraintsSchema = props["constraints"] as { default?: unknown } | undefined;
    const constraintsDefault = constraintsSchema?.default;

    if (!Array.isArray(constraintsDefault)) {
      // No pre-defined constraints (or not in the expected place); skip this rule definition.
      continue;
    }

    // Process each constraint
    for (const constraint of constraintsDefault) {
      if (
        !constraint ||
        typeof constraint !== "object" ||
        typeof constraint.source !== "string" ||
        typeof constraint.target !== "string"
      ) {
        continue;
      }

      const sourceKey = constraint.source;
      const targetKey = constraint.target;

      const sourceValue = (questionSchema as Record<string, unknown>)[sourceKey];
      const enumValues = toEnumValues(sourceValue);

      // If no values extracted, skip injection
      if (!Array.isArray(enumValues) || enumValues.length === 0) {
        continue;
      }

      // Ensure target property exists
      const targetProp = props[targetKey] as JsonObject | undefined;
      if (!targetProp || typeof targetProp !== "object") {
        // Create a minimal property with enum
        props[targetKey] = {
          type: "string",
          title: targetKey,
          enum: enumValues,
        };
        continue;
      }

      // If target is an array property, set items.enum; otherwise, set property-level enum.
      const isArrayType =
        targetProp.type === "array" || typeof (targetProp as { items?: unknown }).items === "object";

      if (isArrayType) {
        const items = ((targetProp as { items?: Record<string, unknown> }).items ?? {}) as Record<string, unknown> & { enum?: string[] };
        items.enum = enumValues;
        (targetProp as { items?: Record<string, unknown> }).items = items;
      } else {
        (targetProp as { enum?: string[] }).enum = enumValues;
      }
    }

    // Write back properties (explicitly)
    (defSchema as { properties?: JsonObject }).properties = props;
    updated[defName] = defSchema;
  }

  return updated;
}

// Example usage:
/*
import fs from "fs";

const rulesSchema = JSON.parse(fs.readFileSync("src/schemas/rules.json", "utf-8"));

// Suppose your question map (instances) looks like this:
const questionMap: Record<string, any> = {
  Q1: { type: "CHOICE", options: ["A", "B", "C"], allow_multiple: true },
  Q2: { type: "TEXT" },
  Q3: { type: "CHOICE", options: ["A", "B"], allow_multiple: true },
};

// If you want to inject constraints for Q1:
// For MultipleChoiceRule, its default constraint is { type: "CHOICE", source: "options", target: "answer" }
// This will set:
// - MultipleChoiceRule.properties.answer.items.enum = ["A", "B", "C"]
const updated = injectEnumsFromConstraintsForQuestion(rulesSchema, questionMap, "Q1");
console.log(JSON.stringify(updated, null, 2));
*/