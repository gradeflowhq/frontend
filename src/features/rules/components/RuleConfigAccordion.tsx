import { Accordion, Alert, Skeleton, Stack } from '@mantine/core';
import React from 'react';

import { getErrorMessage } from '@utils/error';

import { useRuleSchema } from '../api';
import RuleRenderer from './RuleRenderer';

import type { RuleValue } from '../types';
import type { JSONSchema7 } from 'json-schema';

interface Props {
  assessmentId: string;
  value: RuleValue;
  contextQuestionId?: string;
}

const RuleConfigAccordion: React.FC<Props> = ({ assessmentId, value, contextQuestionId }) => {
  const schemaParams = React.useMemo(
    () => ({
      type: value.type,
      ...(contextQuestionId ? { question_id: contextQuestionId } : {}),
    }),
    [contextQuestionId, value.type],
  );
  const schema = useRuleSchema(assessmentId, schemaParams);

  return (
    <Accordion variant="separated" keepMounted={false}>
      <Accordion.Item value="rule-preview">
        <Accordion.Control>Config</Accordion.Control>
        <Accordion.Panel>
          {schema.isLoading && (
            <Stack gap="xs">
              <Skeleton height={28} />
              <Skeleton height={28} />
            </Stack>
          )}
          {schema.isError && <Alert color="red">{getErrorMessage(schema.error)}</Alert>}
          {schema.data?.schema && (
            <RuleRenderer
              value={value}
              schema={schema.data.schema as JSONSchema7}
              hideRootType
              flatRoot
            />
          )}
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};

export default RuleConfigAccordion;
