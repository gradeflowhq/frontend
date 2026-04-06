import { Alert, Button, Group, Modal, Text } from '@mantine/core';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { MasterDetailLayout } from './MasterDetailLayout';
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
  const [detailPanelEditing, setDetailPanelEditing] = useState(false);
  const [pendingQid, setPendingQid] = useState<string | null>(null);
  // Controlled mobile-detail visibility — opened by handleSelect, closed by
  // MasterDetailLayout's back button or when selection changes to null.
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const allRules = useMemo<RuleValue[]>(
    () => (rubric?.rules ?? []) as RuleValue[],
    [rubric],
  );

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

  const urlQid = searchParams.get('q');
  const selectedQid = useMemo(() => {
    if (urlQid && questionIds.includes(urlQid)) return urlQid;
    return questionIds[0] ?? null;
  }, [urlQid, questionIds]);

  // Initialise URL param on first mount
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

  const handleSelect = useCallback(
    (qid: string): void => {
      // If editing, park the destination and show the desktop guard modal.
      // Mobile guard is handled inside MasterDetailLayout via isDetailEditing.
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

  // Desktop unsaved-changes: user confirmed navigation
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
    setPendingQid(null);
  }, [pendingQid, setSearchParams]);

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
    coveredQuestionIds.has(selectedQid);
  const coveringRule = selectedQid ? coveringRuleByQid[selectedQid] : undefined;
  const handleViewGlobalRule =
    selectedQid && onViewGlobalRule ? () => onViewGlobalRule(selectedQid) : undefined;

  const listPanel = (
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
  );

  const detailPanel = selectedQid ? (
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
  );

  return (
    <>
      <MasterDetailLayout
        listPanel={listPanel}
        detailPanel={detailPanel}
        isDetailEditing={detailPanelEditing}
        listWidth="150px"
        backLabel="Back to questions"
        mobileShowDetail={mobileShowDetail}
        onMobileShowDetailChange={setMobileShowDetail}
      />

      {/*
       * Desktop unsaved-changes guard.
       * The mobile equivalent lives inside MasterDetailLayout (back button →
       * pendingBack modal). Both are intentional — they cover different
       * navigation triggers.
       */}
      <Modal
        opened={pendingQid !== null}
        onClose={() => setPendingQid(null)}
        title="Unsaved changes"
        size="sm"
      >
        <Text mb="md">
          You have an unsaved rule edit. Navigating away will discard it.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={() => setPendingQid(null)}>
            Stay
          </Button>
          <Button color="red" onClick={handleConfirmNavigation}>
            Discard &amp; Continue
          </Button>
        </Group>
      </Modal>
    </>
  );
};

export default SingleTargetRulesSection;