import { Accordion, Box, Stack } from '@mantine/core';
import React, { useCallback, useState } from 'react';

import { usePreviewGrading, useCancelGradingPreview } from '@features/grading/api';
import { GradingPreviewPanel, GradingPreviewSettings } from '@features/grading/components';
import {
  DEFAULT_GRADING_PREVIEW_LIMIT,
  DEFAULT_GRADING_PREVIEW_SELECTION,
} from '@features/grading/previewConfig';

import type { GradingPreviewRequestRule } from '@api/models';
import type { GradingPreviewParams } from '@features/grading/components';
import type { RuleValue } from '@features/rules/types';

interface Props {
  rule: RuleValue;
  assessmentId: string;
}

const DEFAULT_PREVIEW_PARAMS: GradingPreviewParams = {
  limit: DEFAULT_GRADING_PREVIEW_LIMIT,
  selection: DEFAULT_GRADING_PREVIEW_SELECTION,
  seed: null,
};

const InlineRulePreview: React.FC<Props> = ({ rule, assessmentId }) => {
  const [previewParams, setPreviewParams] = useState<GradingPreviewParams>(DEFAULT_PREVIEW_PARAMS);
  const previewMutation = usePreviewGrading(assessmentId);
  const cancelPreviewMutation = useCancelGradingPreview(assessmentId);
  // Tracks whether the last failure was caused by a user cancellation,
  // to suppress showing an error panel in that case.
  const [wasCancelled, setWasCancelled] = useState(false);

  const handleRun = useCallback(async (): Promise<void> => {
    setWasCancelled(false);
    await previewMutation.mutateAsync({
      rule: rule as GradingPreviewRequestRule,
      config: previewParams,
    });
  }, [previewMutation, previewParams, rule]);

  const handleCancel = useCallback((): void => {
    setWasCancelled(true);
    cancelPreviewMutation.mutate(undefined, {
      onSuccess: () => {
        previewMutation.reset();
      },
    });
  }, [cancelPreviewMutation, previewMutation]);

  const hasResults = (previewMutation.data?.submissions?.length ?? 0) > 0;
  const showPanel =
    previewMutation.isPending ||
    (previewMutation.isError && !wasCancelled) ||
    hasResults;

  return (
    <Accordion variant="separated">
      <Accordion.Item value="preview">
        <Accordion.Control>Grading Preview</Accordion.Control>
        <Accordion.Panel>
          <Stack gap="md">
            <GradingPreviewSettings
              value={previewParams}
              onChange={setPreviewParams}
              onRun={handleRun}
              runLoading={previewMutation.isPending}
              onCancel={handleCancel}
              cancelLoading={cancelPreviewMutation.isPending}
            />
            {showPanel && (
              <Box>
                <GradingPreviewPanel
                  items={previewMutation.data?.submissions ?? []}
                  loading={previewMutation.isPending}
                  status={previewMutation.previewStatus}
                  progress={previewMutation.previewProgress}
                  error={previewMutation.isError ? previewMutation.error : undefined}
                  answerQuestionIds={previewMutation.data?.answer_question_ids ?? []}
                  resultQuestionIds={previewMutation.data?.result_question_ids ?? []}
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
