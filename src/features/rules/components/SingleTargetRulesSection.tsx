import { Alert, Box, Button, Group, Modal, ScrollArea, Stack, Text } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import QuestionDetailPanel from './QuestionDetailPanel';
import QuestionMasterList from './QuestionMasterList';

import type { RuleValue } from '../types';
import type { AdjustableSubmission, QuestionSetOutputQuestionMap, RubricOutput } from '@api/models';

interface Props {
  rubric: RubricOutput | null;
  questionIds: string[];
  questionTypesById: Record<string, string>;
  assessmentId: string;
  questionMap: QuestionSetOutputQuestionMap;
  coveredQuestionIds: Set<string>;
  searchQuery?: string;
  coveringRuleByQid?: Record<string, RuleValue>;
  onViewGlobalRule?: (qid: string) => void;
  gradingItems?: AdjustableSubmission[];
  totalStudents?: number;
}

const SingleTargetRulesSection: React.FC<Props> = ({
  rubric,
  questionIds,
  questionTypesById,
  assessmentId,
  questionMap,
  coveredQuestionIds,
  searchQuery = '',
  coveringRuleByQid = {},
  onViewGlobalRule,
  gradingItems,
  totalStudents,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [detailPanelEditing, setDetailPanelEditing] = useState(false);
  const [pendingQid, setPendingQid] = useState<string | null>(null);

  const allRules = useMemo<RuleValue[]>(
    () => (rubric?.rules ?? []) as RuleValue[],
    [rubric],
  );

  // Group rules by question_id
  const byQuestion = useMemo((): Record<string, RuleValue[]> => {
    const map: Record<string, RuleValue[]> = {};
    for (const rule of allRules) {
      const qid = (rule as { question_id?: unknown }).question_id;
      if (typeof qid === 'string') {
        if (!map[qid]) map[qid] = [];
        map[qid].push(rule);
      }
    }
    return map;
  }, [allRules]);

  // Derive selected qid from URL param, falling back to the first question
  const urlQid = searchParams.get('q');
  const selectedQid: string | null = useMemo(() => {
    if (urlQid && questionIds.includes(urlQid)) return urlQid;
    return questionIds[0] ?? null;
  }, [urlQid, questionIds]);

  // Write selection to URL (with navigation guard when editing)
  const handleSelect = useCallback(
    (qid: string): void => {
      if (detailPanelEditing) {
        setPendingQid(qid);
        return;
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('q', qid);
          return next;
        },
        { replace: true },
      );
      setMobileShowDetail(true);
    },
    [detailPanelEditing, setSearchParams],
  );

  const handleConfirmNavigation = useCallback((): void => {
    if (!pendingQid) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('q', pendingQid);
        return next;
      },
      { replace: true },
    );
    setMobileShowDetail(true);
    setPendingQid(null);
  }, [pendingQid, setSearchParams]);

  // On first mount, ensure URL reflects the default selection
  useEffect(() => {
    if (!urlQid && questionIds.length > 0 && questionIds[0]) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('q', questionIds[0]!);
          return next;
        },
        { replace: true },
      );
    }
  }, [urlQid, questionIds, setSearchParams]);

  if (questionIds.length === 0) {
    return (
      <Alert color="blue" mt="sm">
        No questions found. Infer or set a question set first.
      </Alert>
    );
  }

  const selectedRules = selectedQid ? (byQuestion[selectedQid] ?? []) : [];
  const selectedType = selectedQid ? (questionTypesById[selectedQid] ?? 'TEXT') : 'TEXT';
  const coveredByGlobal =
    !!selectedQid &&
    selectedRules.length === 0 &&
    coveredQuestionIds.has(selectedQid) &&
    !!coveringRuleByQid[selectedQid];
  const coveringRule = selectedQid ? coveringRuleByQid[selectedQid] : undefined;

  const handleViewGlobalRule = selectedQid
    ? (): void => onViewGlobalRule?.(selectedQid)
    : undefined;

  return (
    <>
      {/* ── Desktop: side-by-side ── */}
      <Group
        align="stretch"
        gap={0}
        wrap="nowrap"
        visibleFrom="sm"
        style={{
          height: 'clamp(480px, calc(100vh - 190px), 900px)',
          overflow: 'hidden',
        }}
      >
        <Box w={150}>
          <QuestionMasterList
            questionIds={questionIds}
            questionTypesById={questionTypesById}
            byQuestion={byQuestion}
            coveredQuestionIds={coveredQuestionIds}
            coveringRuleByQid={coveringRuleByQid}
            selectedQid={selectedQid}
            onSelect={handleSelect}
            searchQuery={searchQuery}
            gradingItems={gradingItems}
            totalStudents={totalStudents}
          />
        </Box>

        <ScrollArea style={{ flex: 1, height: '100%' }} offsetScrollbars>
          <Box p="md">
            {selectedQid ? (
              <QuestionDetailPanel
                key={selectedQid}
                qid={selectedQid}
                questionType={selectedType}
                rules={selectedRules}
                allRules={allRules}
                coveredByGlobal={coveredByGlobal}
                coveringRule={coveringRule}
                questionMap={questionMap}
                assessmentId={assessmentId}
                onViewGlobalRule={handleViewGlobalRule}
                onEditStateChange={setDetailPanelEditing}
              />
            ) : (
              <Text c="dimmed" size="sm">Select a question to view its rules.</Text>
            )}
          </Box>
        </ScrollArea>
      </Group>

      {/* ── Mobile: list or detail ── */}
      <Stack gap="sm" hiddenFrom="sm">
        {!mobileShowDetail ? (
          <QuestionMasterList
            questionIds={questionIds}
            questionTypesById={questionTypesById}
            byQuestion={byQuestion}
            coveredQuestionIds={coveredQuestionIds}
            coveringRuleByQid={coveringRuleByQid}
            selectedQid={selectedQid}
            onSelect={handleSelect}
            searchQuery={searchQuery}
            gradingItems={gradingItems}
            totalStudents={totalStudents}
          />
        ) : (
          <Stack gap="md">
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconArrowLeft size={14} />}
              onClick={() => {
                if (detailPanelEditing) {
                  setPendingQid('__back__');
                  return;
                }
                setMobileShowDetail(false);
              }}
              style={{ alignSelf: 'flex-start' }}
            >
              Back to questions
            </Button>
            {selectedQid && (
              <QuestionDetailPanel
                key={selectedQid}
                qid={selectedQid}
                questionType={selectedType}
                rules={selectedRules}
                allRules={allRules}
                coveredByGlobal={coveredByGlobal}
                coveringRule={coveringRule}
                questionMap={questionMap}
                assessmentId={assessmentId}
                onViewGlobalRule={handleViewGlobalRule}
                onEditStateChange={setDetailPanelEditing}
              />
            )}
          </Stack>
        )}
      </Stack>

      {/* ── Navigate-away confirmation ── */}
      <Modal
        opened={pendingQid !== null}
        onClose={() => setPendingQid(null)}
        title="Unsaved changes"
        size="sm"
      >
        <Text mb="md">You have an unsaved rule edit. Navigating away will discard it.</Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={() => setPendingQid(null)}>
            Stay
          </Button>
          <Button
            color="red"
            onClick={() => {
              if (pendingQid === '__back__') {
                setPendingQid(null);
                setMobileShowDetail(false);
              } else {
                handleConfirmNavigation();
              }
            }}
          >
            Discard &amp; Continue
          </Button>
        </Group>
      </Modal>
    </>
  );
};

export default SingleTargetRulesSection;
