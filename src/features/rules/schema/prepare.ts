import {
  augmentRulesSchemaWithQuestionIdEnums,
  augmentRulesSchemaWithTitles,
  filterNestedRuleOneOfByQuestionType,
  parameterTitleResolver,
  prependUnselectedPlaceholderToNestedOneOf,
  ruleTitleResolver,
} from './augment';
import { injectEnumsFromConstraintsForQuestion } from './constraints';
import { stripEngineKeysFromRulesSchema } from './strip';

type JsonObject = Record<string, unknown>;

export interface PrepareRuleDefinitionsForRenderOptions {
  questionMap?: Record<string, JsonObject>;
  questionId?: string | null;
  questionType?: string | null;
  isSingleTarget?: boolean;
}

export function prepareRuleDefinitionsForRender(
  defs: JsonObject,
  {
    questionMap,
    questionId,
    questionType,
    isSingleTarget = false,
  }: PrepareRuleDefinitionsForRenderOptions = {},
): JsonObject {
  let prepared = questionMap
    ? augmentRulesSchemaWithQuestionIdEnums(defs, questionMap)
    : defs;

  if (questionMap && isSingleTarget && questionId) {
    prepared = injectEnumsFromConstraintsForQuestion(prepared, questionMap, questionId);
  }

  if (isSingleTarget && questionId && questionType) {
    prepared = filterNestedRuleOneOfByQuestionType(prepared, questionType);
  }

  prepared = stripEngineKeysFromRulesSchema(prepared);

  prepared = prependUnselectedPlaceholderToNestedOneOf(prepared);

  return augmentRulesSchemaWithTitles(prepared, [ruleTitleResolver, parameterTitleResolver]);
}