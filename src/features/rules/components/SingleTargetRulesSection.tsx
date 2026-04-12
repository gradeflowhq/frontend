import { Alert, Text } from '@mantine/core';
import React, { useCallback, useMemo, useState } from 'react';

import MasterDetailLayout from '@components/common/MasterDetailLayout';
import QuestionMasterList from '@components/common/QuestionMasterList';
import { useGuardRegistration } from '@hooks/useUnsavedChangesGuard';
import { useUrlSelectedId } from '@hooks/useUrlSelectedId';

import QuestionDetailPanel from './QuestionDetailPanel';


import type { RuleValue } from '../types';
import type { AdjustableSubmission, QuestionSetOutputQuestionMap, RubricOutput } from '@api/models';
import type { GuardedSectionProps } from '@hooks/useUnsavedChangesGuard';

interface Props extends GuardedSectionProps {
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
  guard,
  onEditStateChange,
  registerResetEditing,
}) => {
  const [detailPanelEditing, setDetailPanelEditing] = useState(false);
  // Controlled mobile-detail visibility — opened by handleSelect, closed by
  // MasterDetailLayout's back button or when selection changes to null.
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const resetEditing = useCallback(() => {
    setDetailPanelEditing(false);
  }, []);

  useGuardRegistration(detailPanelEditing, onEditStateChange, registerResetEditing, resetEditing);

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

  const { selectedId: selectedQid, setSelectedId: setSelectedQid } = useUrlSelectedId(questionIds, 'q');

  const handleSelect = useCallback(
    (qid: string): void => {
      guard(() => {
        setSelectedQid(qid);
        setMobileShowDetail(true);
      });
    },
    [guard, setSelectedQid],
  );

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
    <MasterDetailLayout
      listPanel={listPanel}
      detailPanel={detailPanel}
      isDetailEditing={detailPanelEditing}
      listWidth="150px"
      layoutHeight="calc(100dvh - 100px - 55px)"
      backLabel="Back to questions"
      mobileShowDetail={mobileShowDetail}
      onMobileShowDetailChange={setMobileShowDetail}
    />
  );
};

export default SingleTargetRulesSection;