import React, { useMemo, useState } from 'react';

import AnswerText from '@components/common/AnswerText';
import EmptyState from '@components/common/EmptyState';
import ErrorAlert from '@components/common/ErrorAlert';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import { Button } from '@components/ui/Button';
import { IconEdit, IconQuestions, IconSave } from '@components/ui/Icon';
import LoadingButton from '@components/ui/LoadingButton';
import PaginationControls from '@components/ui/PaginationControls';
import questionsSchema from '@schemas/questions.json';
import type { JSONSchema7Definition } from 'json-schema';

import type {
  QuestionSetInput,
  QuestionSetOutputQuestionMap,
  ChoiceQuestion,
  MultiValuedQuestion,
  TextQuestion,
  NumericQuestion,
} from '@api/models';
import { getQuestionIdsSorted } from '@features/questions/helpers';
import type { JsonValue } from './QuestionsConfigRender';

const UNPARSABLE_MARKER = '__UNPARSABLE__:';
type QuestionDef = ChoiceQuestion | MultiValuedQuestion | TextQuestion | NumericQuestion;
type QuestionDraft = Partial<QuestionDef>;
type ExamplesByQuestion = Record<string, unknown[]>;

type Props = {
  questionMap: QuestionSetOutputQuestionMap;
  examplesByQuestion: ExamplesByQuestion;
  onUpdateQuestionSet: (next: QuestionSetInput) => Promise<void> | void;
  updating?: boolean;
  updateError?: unknown;
  initialPageSize?: number;
  searchQuery?: string;
  loadingQuestions?: boolean;
  loadingExamples?: boolean;
  examplesError?: string;
};

const QuestionsTable: React.FC<Props> = ({
  questionMap,
  examplesByQuestion,
  onUpdateQuestionSet,
  updating,
  updateError,
  initialPageSize = 10,
  searchQuery,
  loadingQuestions = false,
  loadingExamples = false,
  examplesError,
}) => {
  const [drafts, setDrafts] = useState<Record<string, QuestionDraft>>({});
  const [openEdits, setOpenEdits] = useState<Record<string, boolean>>({});

  // pagination (simple client-side)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const ids = useMemo(() => getQuestionIdsSorted(questionMap), [questionMap]);

  const filteredIds = useMemo(() => {
    const q = (searchQuery ?? '').trim().toLowerCase();
    if (!q) return ids;

    return ids.filter((qid) => {
      const def = drafts[qid] ?? (questionMap[qid] as QuestionDef | undefined);
      const type = (def?.type as string) ?? '';
      if (qid.toLowerCase().includes(q)) return true;
      if (type.toLowerCase().includes(q)) return true;
      const configText = JSON.stringify(def ?? {}).toLowerCase();
      if (configText.includes(q)) return true;
      const examples = examplesByQuestion[qid] ?? [];
      return examples.some((ex) => String(ex ?? '').toLowerCase().includes(q));
    });
  }, [ids, questionMap, drafts, examplesByQuestion, searchQuery]);

  const pagedIds = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredIds.slice(start, start + pageSize);
  }, [filteredIds, pageIndex, pageSize]);

  const selectRootSchema = (type: string | undefined) => {
    const dict = questionsSchema as Record<string, unknown>;
    switch (type) {
      case 'CHOICE':
        return (dict as Record<string, unknown>).ChoiceQuestion ?? null;
      case 'MULTI_VALUED':
        return (dict as Record<string, unknown>).MultiValuedQuestion ?? null;
      case 'NUMERIC':
        return (dict as Record<string, unknown>).NumericQuestion ?? null;
      case 'TEXT':
      default:
        return (dict as Record<string, unknown>).TextQuestion ?? null;
    }
  };

  const buildQuestionSetInput = (): QuestionSetInput => {
    const resolvedDrafts = Object.fromEntries(
      Object.entries(drafts).map(([qid, draft]) => [
        qid,
        { ...(questionMap[qid] as QuestionDef), ...(draft as QuestionDef) } as QuestionDef,
      ])
    );
    return { question_map: { ...questionMap, ...resolvedDrafts } as QuestionSetInput['question_map'] };
  };

  if (!ids.length && !loadingQuestions) {
    return (
      <EmptyState
        icon={<IconQuestions />}
        title="No questions"
        description="Upload or import a question set, or infer from submissions."
      />
    );
  }

  if (filteredIds.length === 0 && !loadingQuestions) {
    return (
      <div className="alert alert-ghost">
        <span>No questions match your search.</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-box border border-base-300 bg-base-100">
      {!!updateError && <ErrorAlert error={updateError} className="mt-2" />}
      <div className="overflow-x-auto">
        <table className="table table-sm table-zebra table-pin-cols w-full">
          <thead className="sticky top-0 bg-base-100">
            <tr>
              <td>Question ID</td>
              <td>Type</td>
              <td>Configuration</td>
              <td>Example answers</td>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedIds.map((qid) => {
              const baseDef = questionMap[qid] as QuestionDef | undefined;
              const def = drafts[qid]
                ? ({ ...(baseDef ?? {}), ...(drafts[qid] as QuestionDef) } as QuestionDef)
                : baseDef;
              const type = (def?.type as string) ?? 'TEXT';
              const rootSchema = selectRootSchema(type);
              const examples = examplesByQuestion[qid] ?? [];
              const isEditing = !!openEdits[qid];

              return (
                <tr key={qid}>
                  <td className="align-top">
                    <span className="font-mono text-sm">{qid}</span>
                  </td>

                  <td className="align-top">
                    {!isEditing ? (
                      <span className="badge badge-ghost">{type}</span>
                    ) : (
                      <select
                        className="select select-bordered select-sm"
                        value={type}
                        onChange={(e) => {
                          const nextType = e.target.value as QuestionDef['type'];
                          setDrafts((prev) => ({
                            ...prev,
                            [qid]: { ...(questionMap[qid] as QuestionDef), ...(prev[qid] ?? {}), type: nextType },
                          }));
                        }}
                      >
                        <option value="TEXT">TEXT</option>
                        <option value="NUMERIC">NUMERIC</option>
                        <option value="CHOICE">CHOICE</option>
                        <option value="MULTI_VALUED">MULTI_VALUED</option>
                      </select>
                    )}
                  </td>

                  <td className="align-top">
                    {!isEditing ? (
                      <QuestionsConfigRender value={(def ?? baseDef ?? {}) as JsonValue} />
                    ) : rootSchema ? (
                      <div className="max-w-xl">
                        <SchemaForm<QuestionDef>
                          schema={{ ...rootSchema, definitions: questionsSchema as Record<string, JSONSchema7Definition> }}
                          uiSchema={{
                            'ui:title': '',
                            'ui:options': { label: true },
                            'ui:submitButtonOptions': { norender: true },
                            type: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
                          }}
                          formData={def ?? baseDef}
                          onChange={({ formData }) => {
                            const next = { ...(formData || {}), type } as QuestionDef;
                            setDrafts((prev) => ({ ...prev, [qid]: next }));
                          }}
                          onSubmit={() => {}}
                          formProps={{ noHtml5Validate: true }}
                          showSubmit={false}
                        />
                      </div>
                    ) : (
                      <span className="opacity-60">No config</span>
                    )}
                  </td>

                  <td className="align-top">
                    {loadingExamples ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="skeleton h-4 w-32" />
                        ))}
                      </div>
                    ) : examples.length ? (
                      <ul className="list-disc ml-4 text-xs">
                        {examples
                          .filter((value) => !(typeof value === 'string' && value.includes(UNPARSABLE_MARKER)))
                          .slice(0, 5)
                          .map((ex, i) => {
                            const text = typeof ex === 'string' ? ex : String(ex ?? '');
                            return (
                              <li key={`clean-${i}`} className="font-mono">
                                <AnswerText value={text} maxLength={50} />
                              </li>
                            );
                          })}

                        {examples
                          .filter((value) => typeof value === 'string' && value.includes(UNPARSABLE_MARKER))
                          .slice(0, 5)
                          .map((ex, i) => {
                            const text = typeof ex === 'string' ? ex.replace(UNPARSABLE_MARKER, '') : String(ex ?? '');
                            return (
                              <li key={`raw-${i}`} className="font-mono text-red-500">
                                <AnswerText value={text} maxLength={50} />
                              </li>
                            );
                          })}
                      </ul>
                    ) : examplesError ? (
                      <span className="opacity-60">{examplesError}</span>
                    ) : (
                      <span className="opacity-60">—</span>
                    )}
                  </td>

                  <th className="align-top">
                    {!isEditing ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setOpenEdits((prev) => ({ ...prev, [qid]: true }));
                          setDrafts((prev) => ({ ...prev, [qid]: (questionMap[qid] as QuestionDef) }));
                        }}
                        leftIcon={<IconEdit />}
                      >
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <LoadingButton
                          size="sm"
                          variant="primary"
                          isLoading={updating}
                          onClick={() => {
                            const nextQS = buildQuestionSetInput();
                            void Promise.resolve(onUpdateQuestionSet(nextQS)).then(() => {
                              setOpenEdits((prev) => ({ ...prev, [qid]: false }));
                              setDrafts((prev) => {
                                const { [qid]: _removed, ...rest } = prev;
                                return rest;
                              });
                            });
                          }}
                          leftIcon={<IconSave />}
                        >
                          Save
                        </LoadingButton>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDrafts((prev) => {
                              const { [qid]: _removed, ...rest } = prev;
                              return rest;
                            });
                            setOpenEdits((prev) => ({ ...prev, [qid]: false }));
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </th>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PaginationControls
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalItems={filteredIds.length}
        onPageIndexChange={setPageIndex}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPageIndex(0);
        }}
        className="px-3 py-2"
      />
    </div>
  );
};

// Local import to avoid circular TS errors when using the renderer above
// eslint-disable-next-line import/order
import QuestionsConfigRender from './QuestionsConfigRender';
export default QuestionsTable;