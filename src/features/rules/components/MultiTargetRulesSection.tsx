import { Alert, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import React, { useCallback, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'react-router-dom';

import MasterDetailLayout from '@components/common/MasterDetailLayout';
import {
  useCompatibleRuleKeys,
  useCreateRule,
  useDeleteRule,
  useRuleDefinitions,
} from '@features/rules/api';
import { materializeDraft } from '@features/rules/hooks/useRuleEditorState';
import { isMultiTargetRule } from '@features/rules/schema';
import { useGuardRegistration } from '@hooks/useUnsavedChangesGuard';

import GlobalRuleDetailPanel from './GlobalRuleDetailPanel';
import GlobalRuleMasterList from './GlobalRuleMasterList';

import type { QuestionSetOutputQuestionMap, RubricOutput } from '@api/models';
import type { RuleValue } from '@features/rules/types';
import type { GuardedSectionProps } from '@hooks/useUnsavedChangesGuard';

interface Props extends GuardedSectionProps {
  rubric: RubricOutput | null;
  assessmentId: string;
  questionMap: QuestionSetOutputQuestionMap;
  searchQuery?: string;
  highlightedRule?: RuleValue | null;
}

const SEARCH_PARAM = 'gr';

const MultiTargetRulesSection: React.FC<Props> = ({
  rubric,
  assessmentId,
  questionMap,
  searchQuery = '',
  highlightedRule,
  guard,
  onEditStateChange,
  registerResetEditing,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [detailEditing, setDetailEditing] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const [pendingNewRule, setPendingNewRule] = useState<{
    ruleKey: string;
    draft: RuleValue;
  } | null>(null);

  const defs = useRuleDefinitions();
  const createRule = useCreateRule(assessmentId);
  const deleteRule = useDeleteRule(assessmentId);

  const rawEligibleKeys = useCompatibleRuleKeys(defs, undefined, false);
  const multiRuleKeys = useMemo(
    () => rawEligibleKeys.filter((k) => k.includes('MultiQuestionRule')),
    [rawEligibleKeys],
  );

  const allRules = useMemo<RuleValue[]>(
    () => (rubric?.rules ?? []) as RuleValue[],
    [rubric],
  );

  const multiRules = useMemo(
    () => allRules.filter(isMultiTargetRule),
    [allRules],
  );

  // ── URL-synced selected rule ID ───────────────────────────────────────────

  const urlRuleId = searchParams.get(SEARCH_PARAM);
  const selectedRuleId = useMemo(() => {
    if (pendingNewRule) return null;

    if (urlRuleId && multiRules.some((rule) => rule.id === urlRuleId)) {
      return urlRuleId;
    }

    return multiRules.length > 0 ? multiRules[0].id : null;
  }, [urlRuleId, multiRules, pendingNewRule]);

  const setSelectedRuleId = useCallback(
    (ruleId: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(SEARCH_PARAM, ruleId);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Keep the URL selection populated with a valid rule id.
  React.useEffect(() => {
    if (!selectedRuleId || urlRuleId === selectedRuleId || pendingNewRule) {
      return;
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(SEARCH_PARAM, selectedRuleId);
        return next;
      },
      { replace: true },
    );
  }, [pendingNewRule, selectedRuleId, setSearchParams, urlRuleId]);

  // ── Highlight from parent tab ─────────────────────────────────────────────

  React.useEffect(() => {
    if (!highlightedRule) return;
    if (multiRules.some((rule) => rule.id === highlightedRule.id)) {
      setPendingNewRule(null);
      setMobileShowDetail(true);
    }
  }, [highlightedRule, multiRules]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isCurrentlyEditing = detailEditing || !!pendingNewRule;

  const resetEditing = useCallback(() => {
    setDetailEditing(false);
    setPendingNewRule(null);
  }, []);

  useGuardRegistration(isCurrentlyEditing, onEditStateChange, registerResetEditing, resetEditing);

  const commitSelectRule = useCallback(
    (ruleId: string) => {
      setPendingNewRule(null);
      setSelectedRuleId(ruleId);
      setMobileShowDetail(true);
    },
    [setSelectedRuleId],
  );

  const commitAdd = useCallback(
    (ruleKey: string) => {
      const schema = defs[ruleKey] ?? null;
      const draft = materializeDraft(schema, null, null);
      setPendingNewRule({ ruleKey, draft });
      setMobileShowDetail(true);
    },
    [defs],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (ruleId: string) => {
      guard(() => commitSelectRule(ruleId));
    },
    [guard, commitSelectRule],
  );

  const handleAdd = useCallback(
    (ruleKey: string) => {
      guard(() => commitAdd(ruleKey));
    },
    [guard, commitAdd],
  );

  const handleSavePending = useCallback(
    async (savedRule: RuleValue) => {
      // Don't catch here — let the caller (GlobalRuleDetailPanel) display the
      // inline error. mutateAsync will still reject and propagate on failure.
      const existingRuleIds = new Set(multiRules.map((rule) => rule.id));
      const result = await createRule.mutateAsync(savedRule);
      const createdRule = [...((result.rubric.rules ?? []) as RuleValue[])]
        .reverse()
        .find((rule) => isMultiTargetRule(rule) && !existingRuleIds.has(rule.id));

      // Flush editing-state changes synchronously so the parent guard sees
      // isEditing=false before setSelectedRuleId triggers a search-param change.
      flushSync(() => {
        setDetailEditing(false);
        setPendingNewRule(null);
      });
      if (createdRule) {
        setSelectedRuleId(createdRule.id);
      }
      notifications.show({ color: 'green', message: 'Rule saved' });
    },
    [createRule, multiRules, setSelectedRuleId],
  );

  const handleDelete = useCallback(
    (ruleId: string) => {
      const deletedIndex = multiRules.findIndex((rule) => rule.id === ruleId);
      if (deletedIndex < 0) return;

      deleteRule.mutate(ruleId, {
        onSuccess: () => {
          notifications.show({ color: 'green', message: 'Rule deleted' });
          const remainingMulti = multiRules.filter((rule) => rule.id !== ruleId);
          if (remainingMulti.length === 0) {
            setMobileShowDetail(false);
          } else {
            const nextRule = remainingMulti[Math.max(0, deletedIndex - 1)];
            setSelectedRuleId(nextRule.id);
          }
        },
        onError: () => notifications.show({ color: 'red', message: 'Delete failed' }),
      });
    },
    [deleteRule, multiRules, setSelectedRuleId],
  );

  // ── Early returns ─────────────────────────────────────────────────────────

  if (multiRuleKeys.length === 0) {
    return <Alert color="gray">No global rule types are available.</Alert>;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedRule = selectedRuleId
    ? (multiRules.find((rule) => rule.id === selectedRuleId) ?? null)
    : null;

  const detailPanel = pendingNewRule ? (
    <GlobalRuleDetailPanel
      key="pending-new"
      rule={pendingNewRule.draft}
      assessmentId={assessmentId}
      questionMap={questionMap}
      onEditStateChange={setDetailEditing}
      isSaving={createRule.isPending}
      isPendingNew
      onSavePending={handleSavePending}
      onCancelPending={() => {
        setDetailEditing(false);
        setPendingNewRule(null);
        setMobileShowDetail(multiRules.length > 0);
      }}
      onDelete={() => {
        // no-op — pending rules are discarded via cancel
      }}
    />
  ) : selectedRule !== null && selectedRuleId ? (
    <GlobalRuleDetailPanel
      key={selectedRuleId}
      rule={selectedRule}
      assessmentId={assessmentId}
      questionMap={questionMap}
      onEditStateChange={setDetailEditing}
      onDelete={() => handleDelete(selectedRuleId)}
    />
  ) : (
    <Text c="dimmed" size="md" ta="center">
      Select a rule to view or edit it.
    </Text>
  );

  const listPanel = (
    <GlobalRuleMasterList
      rules={multiRules}
      selectedRuleId={selectedRuleId}
      onSelect={handleSelect}
      onAdd={handleAdd}
      addableRuleKeys={multiRuleKeys}
      searchQuery={searchQuery}
    />
  );

  return (
    <MasterDetailLayout
      listPanel={listPanel}
      detailPanel={detailPanel}
      isDetailEditing={isCurrentlyEditing}
      listWidth="210px"
      layoutHeight="calc(100dvh - 100px - 55px)"
      backLabel="Back to rules"
      mobileShowDetail={mobileShowDetail}
      onMobileShowDetailChange={setMobileShowDetail}
    />
  );
};

export default MultiTargetRulesSection;
