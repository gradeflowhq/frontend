import React, { useEffect, useMemo, useState } from 'react';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import ErrorAlert from '@components/common/ErrorAlert';
import LoadingButton from '@components/ui/LoadingButton';
import { Button } from '@components/ui/Button';
import { IconInbox, IconSave, IconEdit } from '@components/ui/Icon';
import AnswerText from '@components/common/AnswerText';
import questionsSchema from '@schemas/questions.json';
import PaginationControls from '@components/ui/PaginationControls';

import type {
  QuestionSetInput,
  QuestionSetOutputQuestionMap,
  ChoiceQuestion,
  MultiValuedQuestion,
  TextQuestion,
  NumericQuestion,
} from '@api/models';
import { getQuestionIdsSorted } from '@features/questions/helpers';

const UNPARSABLE_MARKER = '__UNPARSABLE__:';

type Props = {
  questionMap: QuestionSetOutputQuestionMap;
  examplesByQuestion: { [key: string]: string[] };
  onUpdateQuestionSet: (next: QuestionSetInput) => Promise<void> | void;
  updating?: boolean;
  updateError?: unknown;
  initialPageSize?: number;
};

const QuestionsTable: React.FC<Props> = ({
  questionMap,
  examplesByQuestion,
  onUpdateQuestionSet,
  updating,
  updateError,
  initialPageSize = 10,
}) => {
  const [localMap, setLocalMap] = useState<QuestionSetOutputQuestionMap>({});
  const [openEdits, setOpenEdits] = useState<Record<string, boolean>>({});

  // pagination (simple client-side)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setLocalMap(questionMap ?? {});
    setOpenEdits({});
    setPageIndex(0);
  }, [questionMap]);

  const ids = useMemo(() => getQuestionIdsSorted(localMap), [localMap]);

  const pagedIds = useMemo(() => {
    const start = pageIndex * pageSize;
    return ids.slice(start, start + pageSize);
  }, [ids, pageIndex, pageSize]);

  const selectRootSchema = (type: string | undefined) => {
    const dict = questionsSchema as any;
    switch (type) {
      case 'CHOICE':
        return dict?.ChoiceQuestion ?? null;
      case 'MULTI_VALUED':
        return dict?.MultiValuedQuestion ?? null;
      case 'NUMERIC':
        return dict?.NumericQuestion ?? null;
      case 'TEXT':
      default:
        return dict?.TextQuestion ?? null;
    }
  };

  const buildQuestionSetInput = (): QuestionSetInput => ({
    question_map: localMap as QuestionSetInput['question_map'],
  });

  if (!ids.length) {
    return (
      <div className="hero rounded-box bg-base-200 py-12">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold flex items-center justify-center">
              <IconInbox className="m-2" /> No questions
            </h1>
            <p className="py-2 opacity-70">Upload submissions to infer questions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead className="sticky top-0 bg-base-100">
            <tr>
              <th>Question ID</th>
              <th>Type</th>
              <th>Configuration</th>
              <th>Example answers</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedIds.map((qid) => {
              const def = localMap[qid] as ChoiceQuestion | MultiValuedQuestion | TextQuestion | NumericQuestion | any;
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
                          const nextType = e.target.value;
                          setLocalMap((prev) => ({
                            ...prev,
                            [qid]: { ...(prev[qid] as any), type: nextType },
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
                      // Reuse existing renderer
                      // eslint-disable-next-line @typescript-eslint/no-use-before-define
                      <QuestionsConfigRender value={def} />
                    ) : rootSchema ? (
                      <div className="max-w-xl">
                        <SchemaForm<any>
                          schema={{ ...rootSchema, definitions: questionsSchema as any }}
                          uiSchema={{
                            'ui:title': '',
                            'ui:options': { label: true },
                            'ui:submitButtonOptions': { norender: true },
                            type: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
                          }}
                          formData={def as any}
                          onChange={({ formData }) => {
                            const next = { ...(formData || {}), type };
                            setLocalMap((prev) => ({ ...prev, [qid]: next as any }));
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
                    {examples.length ? (
                      <ul className="list-disc ml-4 text-xs">
                        {examples
                          .filter((value) => !(typeof value === 'string' && value.includes(UNPARSABLE_MARKER)))
                          .slice(0, 5)
                          .map((ex, i) => (
                            <li key={`clean-${i}`} className="font-mono">
                              <AnswerText value={ex} maxLength={50} />
                            </li>
                          ))}

                        {examples
                          .filter((value) => typeof value === 'string' && value.includes(UNPARSABLE_MARKER))
                          .slice(0, 5)
                          .map((ex, i) => (
                            <li key={`raw-${i}`} className="font-mono text-red-500">
                              <AnswerText value={ex.replace(UNPARSABLE_MARKER, "")} maxLength={50} />
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <span className="opacity-60">—</span>
                    )}
                  </td>

                  <td className="align-top">
                    {!isEditing ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setOpenEdits((prev) => ({ ...prev, [qid]: true }))}
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
                          onClick={async () => {
                            const nextQS = buildQuestionSetInput();
                            await onUpdateQuestionSet(nextQS);
                            setOpenEdits((prev) => ({ ...prev, [qid]: false }));
                          }}
                          leftIcon={<IconSave />}
                        >
                          Save
                        </LoadingButton>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setLocalMap((prev) => ({ ...prev, [qid]: questionMap[qid] as any }));
                            setOpenEdits((prev) => ({ ...prev, [qid]: false }));
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                        {!!updateError && <ErrorAlert error={updateError} className="mt-2" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PaginationControls
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalItems={ids.length}
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
import QuestionsConfigRender from './QuestionsConfigRender';
export default QuestionsTable;