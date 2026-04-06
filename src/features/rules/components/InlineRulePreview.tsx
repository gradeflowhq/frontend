import { Accordion, Box, Stack } from '@mantine/core';
import React, { useCallback, useState } from 'react';

import { usePreviewGrading } from '@features/grading/api';
import GradingPreviewPanel from '@features/grading/components/GradingPreviewPanel';
import GradingPreviewSettings from '@features/grading/components/GradingPreviewSettings';

import type { GradingPreviewParams } from '@features/grading/components/GradingPreviewSettings';
import type { RuleValue } from '@features/rules/types';

interface Props {
  rule: RuleValue;
  assessmentId: string;
}

const DEFAULT_PREVIEW_PARAMS: GradingPreviewParams = {
  limit: 5,
  selection: 'first',
  seed: null,
};

const InlineRulePreview: React.FC<Props> = ({ rule, assessmentId }) => {
  const [previewParams, setPreviewParams] = useState<GradingPreviewParams>(DEFAULT_PREVIEW_PARAMS);
  const previewMutation = usePreviewGrading(assessmentId);

  const handleRun = useCallback(async (): Promise<void> => {
    await previewMutation.mutateAsync({
      rule: rule ?? null,
      config: {
        limit: previewParams.limit,
        selection: previewParams.selection,
        seed: previewParams.seed ?? null,
      },
    });
  }, [previewMutation, previewParams, rule]);

  const handleParamsChange = useCallback((next: GradingPreviewParams): void => {
    setPreviewParams(next);
  }, []);

  const hasResults = (previewMutation.data?.submissions?.length ?? 0) > 0;
  const showPanel = previewMutation.isPending || previewMutation.isError || hasResults;

  return (
    <Accordion variant="separated">
      <Accordion.Item value="preview">
        <Accordion.Control>Grading Preview</Accordion.Control>
        <Accordion.Panel>
          <Stack gap="md">
            <GradingPreviewSettings
              value={previewParams}
              onChange={handleParamsChange}
              onRun={handleRun}
              runLoading={previewMutation.isPending}
            />
            {showPanel && (
              <Box>
                <GradingPreviewPanel
                  items={previewMutation.data?.submissions ?? []}
                  loading={previewMutation.isPending}
                  error={previewMutation.isError ? previewMutation.error : undefined}
                />
              </Box>
            )}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};

export default InlineRulePreview;
