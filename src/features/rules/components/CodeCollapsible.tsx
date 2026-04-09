import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { Accordion, Box, Text } from '@mantine/core';
import CodeMirror from '@uiw/react-codemirror';
import React from 'react';

const CodeCollapsible: React.FC<{
  title: string;
  code: string;
  height?: string;
  language?: 'python' | 'text';
}> = ({ title, code, height = '350px', language = 'python' }) => {
  const extensions = language === 'python' ? [python()] : [];
  return (
    <Accordion variant="contained">
      <Accordion.Item value="code">
        <Accordion.Control>
          <Text size="xs" fw={500}>{title}</Text>
        </Accordion.Control>
        <Accordion.Panel>
          <Box style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid var(--mantine-color-default-border)' }}>
            <CodeMirror
              value={code}
              height={height}
              extensions={extensions}
              theme={oneDark}
              readOnly
              basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
            />
          </Box>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};

export default CodeCollapsible;
