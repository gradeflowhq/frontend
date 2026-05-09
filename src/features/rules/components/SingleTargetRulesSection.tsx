import { Alert, Text } from '@mantine/core';
import React, { useCallback, useMemo, useState } from 'react';

import MasterDetailLayout from '@components/common/MasterDetailLayout';
import QuestionMasterList from '@components/common/QuestionMasterList';
import { useGuardRegistration } from '@hooks/useUnsavedChangesGuard';
import { useUrlSelectedId } from '@hooks/useUrlSelectedId';

import QuestionDetailPanel from './QuestionDetailPanel';

import type { RuleValue } from '../types';
import type { QuestionSetOutputQuestionMap, RubricCoverage } from '@api/models';
import type { QuestionCoverageStatus } from '@components/common/QuestionMasterList';
import type { GuardedSectionProps } from '@hooks/useUnsavedChangesGuard';

interface Props extends GuardedSectionProps {
  questionRules: RuleValue[];
  globalRules: RuleValue[];
  coverage: RubricCoverage | null;
  questionIds: string[];
  questionTypesById: Record<string, string>;
  assessmentId: string;
  questionMap: QuestionSetOutputQuestionMap;
  searchQuery?: string;
  onViewGlobalRule?: (qid: string) => void;
}

const SingleTargetRulesSection: React.FC<Props> = ({
  questionRules,
  globalRules,
  coverage,
  questionIds,
  questionTypesById,
  assessmentId,
  questionMap,
  searchQuery = '',
  onViewGlobalRule,
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

  const questionRuleById = useMemo(
    () => new Map(questionRules.flatMap((rule) => (rule.id ? [[rule.id, rule]] : []))),
    [questionRules],
  );

  const globalRuleById = useMemo(
    () => new Map(globalRules.flatMap((rule) => (rule.id ? [[rule.id, rule]] : []))),
    [globalRules],
  );

  const byQuestion = useMemo((): Record<string, RuleValue[]> => {
    const map: Record<string, RuleValue[]> = {};
    const coverageQuestionRules = coverage?.question_rules ?? {};

    for (const qid of questionIds) {
      const ruleId = coverageQuestionRules[qid];
      const rule = ruleId ? questionRuleById.get(ruleId) : undefined;
      if (rule) map[qid] = [rule];
    }
    return map;
  }, [coverage?.question_rules, questionIds, questionRuleById]);

  const coveringRuleByQid = useMemo((): Record<string, RuleValue> => {
    const map: Record<string, RuleValue> = {};
    const coverageGlobalRules = coverage?.global_rules ?? {};

    for (const [qid, ruleId] of Object.entries(coverageGlobalRules)) {
      const rule = globalRuleById.get(ruleId);
      if (rule) map[qid] = rule;
    }
    return map;
  }, [coverage?.global_rules, globalRuleById]);

  const coverageByQid = useMemo((): Record<string, QuestionCoverageStatus> => {
    const map: Record<string, QuestionCoverageStatus> = {};
    for (const qid of coverage?.covered_question_ids ?? []) {
      map[qid] = 'covered';
    }
    for (const qid of Object.keys(coverage?.global_rules ?? {})) {
      map[qid] = 'global';
    }
    for (const qid of Object.keys(coverage?.question_rules ?? {})) {
      map[qid] = 'covered';
    }
    return map;
  }, [coverage?.covered_question_ids, coverage?.global_rules, coverage?.question_rules]);

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
  const coveringRule = selectedQid ? coveringRuleByQid[selectedQid] : undefined;
  const coveredByGlobal =
    !!selectedQid &&
    selectedRules.length === 0 &&
    Boolean(coveringRule);
  const handleViewGlobalRule =
    selectedQid && onViewGlobalRule ? () => onViewGlobalRule(selectedQid) : undefined;

  const listPanel = (
    <QuestionMasterList
      questionIds={questionIds}
      questionTypesById={questionTypesById}
      coverageByQid={coverageByQid}
      selectedQid={selectedQid}
      onSelect={handleSelect}
      searchQuery={searchQuery}
    />
  );

  const detailPanel = selectedQid ? (
    <QuestionDetailPanel
      key={selectedQid}
      qid={selectedQid}
      questionType={selectedType}
      rules={selectedRules}
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
