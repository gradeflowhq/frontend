import { Accordion } from '@mantine/core';
import React from 'react';

import RuleRenderer from './RuleRenderer';

import type { RuleValue } from '../types';

interface Props {
  value: RuleValue;
  contextQuestionId?: string;
}

const RuleConfigAccordion: React.FC<Props> = ({ value, contextQuestionId }) => (
  <Accordion variant="separated" keepMounted={false}>
    <Accordion.Item value="rule-preview">
      <Accordion.Control>Config</Accordion.Control>
      <Accordion.Panel>
        <RuleRenderer
          value={value}
          contextQuestionId={contextQuestionId}
          hideRootType
          flatRoot
        />
      </Accordion.Panel>
    </Accordion.Item>
  </Accordion>
);

export default RuleConfigAccordion;