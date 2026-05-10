import { Alert, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import React, { useCallback, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'react-router-dom';

import MasterDetailLayout from '@components/common/MasterDetailLayout';
import { MasterDetailSkeleton } from '@components/common/Skeletons';
import {
  useCompatibleRules,
  useCreateRule,
  useDeleteRule,
} from '@features/rules/api';
import { useGuardRegistration } from '@hooks/useUnsavedChangesGuard';
import { natsort } from '@utils/sort';

import GlobalRuleDetailPanel from './GlobalRuleDetailPanel';
import GlobalRuleMasterList from './GlobalRuleMasterList';
import RulesDetailPanelSkeleton from './RulesDetailPanelSkeleton';

import type { RubricCoverage } from '@api/models';
import type { RuleValue } from '@features/rules/types';
import type { GuardedSectionProps } from '@hooks/useUnsavedChangesGuard';

interface Props extends GuardedSectionProps {
  globalRules: RuleValue[];
  coverage: RubricCoverage | null;
  assessmentId: string;
  searchQuery?: string;
  highlightedRule?: RuleValue | null;
}

const SEARCH_PARAM = 'gr';
const GLOBAL_RULE_LIST_WIDTH = '210px';
const GLOBAL_RULE_LAYOUT_HEIGHT = 'calc(100dvh - 100px - 55px)';

const GlobalRulesSkeleton: React.FC = () => (
  <MasterDetailSkeleton
    listWidth={GLOBAL_RULE_LIST_WIDTH}
    layoutHeight={GLOBAL_RULE_LAYOUT_HEIGHT}
    listRows={4}
    withListAction
    withListBadges
    listRowHeight={64}
    listRowLineWidths={['64%', '78%', '70%', '58%']}
    listBadgeWidths={[74, 88, 68, 82]}
    listSecondaryBadgeWidths={[42, 54]}
    showListSecondaryBadge={(row) => row % 2 === 0}
    listAriaLabel="Loading global rules"
    detailPanel={<RulesDetailPanelSkeleton />}
  />
);

const MultiTargetRulesSection: React.FC<Props> = ({
  globalRules,
  coverage,
  assessmentId,
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
    ruleType: string;
  } | null>(null);

  const createRule = useCreateRule(assessmentId);
  const deleteRule = useDeleteRule(assessmentId);

  const globalRulesOptions = useCompatibleRules(assessmentId);

  const coveredQidsByRuleId = useMemo((): Record<string, string[]> => {
    const map: Record<string, string[]> = {};
    for (const [ruleId, qids] of Object.entries(coverage?.questions_by_rule ?? {})) {
      map[ruleId] = [...qids].sort(natsort);
    }
    return map;
  }, [coverage?.questions_by_rule]);

  // ── URL-synced selected rule ID ───────────────────────────────────────────

  const urlRuleId = searchParams.get(SEARCH_PARAM);
  const selectedRuleId = useMemo(() => {
    if (pendingNewRule) return null;

    if (urlRuleId && globalRules.some((rule) => rule.id === urlRuleId)) {
      return urlRuleId;
    }

    return globalRules.find((rule) => rule.id)?.id ?? null;
  }, [urlRuleId, globalRules, pendingNewRule]);

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
    if (globalRules.some((rule) => rule.id === highlightedRule.id)) {
      setPendingNewRule(null);
      setMobileShowDetail(true);
    }
  }, [highlightedRule, globalRules]);

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
    (ruleType: string) => {
      setPendingNewRule({ ruleType });
      setMobileShowDetail(true);
    },
    [],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (ruleId: string) => {
      guard(() => commitSelectRule(ruleId));
    },
    [guard, commitSelectRule],
  );

  const handleAdd = useCallback(
    (ruleType: string) => {
      guard(() => commitAdd(ruleType));
    },
    [guard, commitAdd],
  );

  const handleSavePending = useCallback(
    async (savedRule: RuleValue) => {
      // Don't catch here — let the caller (GlobalRuleDetailPanel) display the
      // inline error. mutateAsync will still reject and propagate on failure.
      const existingRuleIds = new Set(globalRules.flatMap((rule) => (rule.id ? [rule.id] : [])));
      const result = await createRule.mutateAsync(savedRule);
      const createdRule = [...(result.rubric.rules ?? []) as RuleValue[]]
        .reverse()
        .find((rule) => rule.id && !existingRuleIds.has(rule.id));

      // Flush editing-state changes synchronously so the parent guard sees
      // isEditing=false before setSelectedRuleId triggers a search-param change.
      flushSync(() => {
        setDetailEditing(false);
        setPendingNewRule(null);
      });
      if (createdRule?.id) {
        setSelectedRuleId(createdRule.id);
      }
      notifications.show({ color: 'green', message: 'Rule saved' });
    },
    [createRule, globalRules, setSelectedRuleId],
  );

  const handleDelete = useCallback(
    (ruleId: string) => {
      const deletedIndex = globalRules.findIndex((rule) => rule.id === ruleId);
      if (deletedIndex < 0) return;

      deleteRule.mutate(ruleId, {
        onSuccess: () => {
          notifications.show({ color: 'green', message: 'Rule deleted' });
          const remainingGlobalRules = globalRules.filter((rule) => rule.id !== ruleId);
          if (remainingGlobalRules.length === 0) {
            setMobileShowDetail(false);
          } else {
            const nextRule = remainingGlobalRules[Math.max(0, deletedIndex - 1)];
            if (nextRule?.id) setSelectedRuleId(nextRule.id);
          }
        },
        onError: () => notifications.show({ color: 'red', message: 'Delete failed' }),
      });
    },
    [deleteRule, globalRules, setSelectedRuleId],
  );

  // ── Early returns ─────────────────────────────────────────────────────────

  if (globalRulesOptions.isLoading) {
    return <GlobalRulesSkeleton />;
  }

  if ((globalRulesOptions.data?.length ?? 0) === 0) {
    return <Alert color="gray">No global rule types are available.</Alert>;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedRule = selectedRuleId
    ? (globalRules.find((rule) => rule.id === selectedRuleId) ?? null)
    : null;

  const detailPanel = pendingNewRule ? (
    <GlobalRuleDetailPanel
      key="pending-new"
      rule={{ type: pendingNewRule.ruleType } as RuleValue}
      assessmentId={assessmentId}
      onEditStateChange={setDetailEditing}
      isSaving={createRule.isPending}
      isPendingNew
      onSavePending={handleSavePending}
      onCancelPending={() => {
        setDetailEditing(false);
        setPendingNewRule(null);
        setMobileShowDetail(globalRules.length > 0);
      }}
      onDelete={() => {
        // no-op — pending rules are discarded via cancel
      }}
      coveredQids={[]}
    />
  ) : selectedRule !== null && selectedRuleId ? (
    <GlobalRuleDetailPanel
      key={selectedRuleId}
      rule={selectedRule}
      assessmentId={assessmentId}
      onEditStateChange={setDetailEditing}
      onDelete={() => handleDelete(selectedRuleId)}
      coveredQids={coveredQidsByRuleId[selectedRuleId] ?? []}
    />
  ) : (
    <Text c="dimmed" size="md" ta="center">
      Select a rule to view or edit it.
    </Text>
  );

  const listPanel = (
    <GlobalRuleMasterList
      rules={globalRules}
      selectedRuleId={selectedRuleId}
      onSelect={handleSelect}
      onAdd={handleAdd}
      addableRules={globalRulesOptions.data ?? []}
      coveredQidsByRuleId={coveredQidsByRuleId}
      searchQuery={searchQuery}
    />
  );

  return (
    <MasterDetailLayout
      listPanel={listPanel}
      detailPanel={detailPanel}
      isDetailEditing={isCurrentlyEditing}
      listWidth={GLOBAL_RULE_LIST_WIDTH}
      layoutHeight={GLOBAL_RULE_LAYOUT_HEIGHT}
      backLabel="Back to rules"
      mobileShowDetail={mobileShowDetail}
      onMobileShowDetailChange={setMobileShowDetail}
    />
  );
};

export default MultiTargetRulesSection;
