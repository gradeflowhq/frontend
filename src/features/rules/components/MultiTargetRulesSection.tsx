import { Alert, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import React, { useCallback, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'react-router-dom';

import MasterDetailLayout from '@components/common/MasterDetailLayout';
import {
  useCompatibleRuleKeys,
  useReplaceRubric,
  useRuleDefinitions,
  useValidateAndReplaceRubric,
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
  const validateAndReplace = useValidateAndReplaceRubric(assessmentId);
  const replace = useReplaceRubric(assessmentId);

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

  // ── URL-synced selected index ─────────────────────────────────────────────

  const urlIndex = searchParams.get(SEARCH_PARAM);
  const selectedIndex = useMemo(() => {
    if (pendingNewRule) return null;
    const parsed = urlIndex !== null ? parseInt(urlIndex, 10) : NaN;
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed < multiRules.length) {
      return parsed;
    }
    return multiRules.length > 0 ? 0 : null;
  }, [urlIndex, multiRules.length, pendingNewRule]);

  const setSelectedIndex = useCallback(
    (index: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(SEARCH_PARAM, String(index));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Initialise URL param on first mount
  React.useEffect(() => {
    if (urlIndex === null && multiRules.length > 0) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(SEARCH_PARAM, '0');
          return next;
        },
        { replace: true },
      );
    }
  }, [urlIndex, multiRules.length, setSearchParams]);

  // ── Highlight from parent tab ─────────────────────────────────────────────

  React.useEffect(() => {
    if (!highlightedRule) return;
    const idx = multiRules.findIndex((r) => r === highlightedRule);
    if (idx >= 0) {
      setPendingNewRule(null);
      // URL already has the correct `gr=N` from RulesPage.handleViewGlobalRule —
      // calling setSelectedIndex here is redundant and causes a snap-back flicker
      // if setSelectedIndex's identity changes between renders.
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

  const commitSelectIndex = useCallback(
    (index: number) => {
      setPendingNewRule(null);
      setSelectedIndex(index);
      setMobileShowDetail(true);
    },
    [setSelectedIndex],
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
    (index: number) => {
      guard(() => commitSelectIndex(index));
    },
    [guard, commitSelectIndex],
  );

  const handleAdd = useCallback(
    (ruleKey: string) => {
      guard(() => commitAdd(ruleKey));
    },
    [guard, commitAdd],
  );

  const handleSavePending = useCallback(
    async (savedRule: RuleValue) => {
      const nextRules = [...allRules, savedRule];
      // Don't catch here — let the caller (GlobalRuleDetailPanel) display the
      // inline error. mutateAsync will still reject and propagate on failure.
      await validateAndReplace.mutateAsync(nextRules, {
        onSuccess: () => {
          const newMultiIndex = nextRules.filter(isMultiTargetRule).length - 1;
          // Flush editing-state changes synchronously so the parent guard
          // sees isEditing=false before setSelectedIndex triggers a
          // search-param navigation.
          flushSync(() => {
            setDetailEditing(false);
            setPendingNewRule(null);
          });
          setSelectedIndex(Math.max(0, newMultiIndex));
          notifications.show({ color: 'green', message: 'Rule saved' });
        },
      });
    },
    [allRules, validateAndReplace, setSelectedIndex, setDetailEditing],
  );

  const handleDelete = useCallback(
    (index: number) => {
      const ruleToDelete = multiRules[index];
      if (!ruleToDelete) return;
      const globalIndex = allRules.indexOf(ruleToDelete);
      if (globalIndex < 0) return;
      const nextRules = allRules.filter((_, i) => i !== globalIndex);
      replace.mutate(nextRules, {
        onSuccess: () => {
          notifications.show({ color: 'green', message: 'Rule deleted' });
          const remainingMulti = nextRules.filter(isMultiTargetRule);
          if (remainingMulti.length === 0) {
            setMobileShowDetail(false);
          } else {
            setSelectedIndex(Math.max(0, index - 1));
          }
        },
        onError: () => notifications.show({ color: 'red', message: 'Delete failed' }),
      });
    },
    [allRules, multiRules, replace, setSelectedIndex],
  );

  // ── Early returns ─────────────────────────────────────────────────────────

  if (multiRuleKeys.length === 0) {
    return <Alert color="gray">No global rule types are available.</Alert>;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedRule =
    selectedIndex !== null ? (multiRules[selectedIndex] ?? null) : null;
  const selectedGlobalIndex =
    selectedRule !== null ? allRules.indexOf(selectedRule) : -1;

  const detailPanel = pendingNewRule ? (
    <GlobalRuleDetailPanel
      key="pending-new"
      ruleIndex={-1}
      rule={pendingNewRule.draft}
      allRules={allRules}
      assessmentId={assessmentId}
      questionMap={questionMap}
      onEditStateChange={setDetailEditing}
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
  ) : selectedRule !== null && selectedGlobalIndex >= 0 ? (
    <GlobalRuleDetailPanel
      key={selectedGlobalIndex}
      ruleIndex={selectedGlobalIndex}
      rule={selectedRule}
      allRules={allRules}
      assessmentId={assessmentId}
      questionMap={questionMap}
      onEditStateChange={setDetailEditing}
      onDelete={() => handleDelete(selectedIndex!)}
    />
  ) : (
    <Text c="dimmed" size="md" ta="center">
      Select a rule to view or edit it.
    </Text>
  );

  const listPanel = (
    <GlobalRuleMasterList
      rules={multiRules}
      selectedIndex={selectedIndex}
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
