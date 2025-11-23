import React, { useEffect, useMemo, useState } from 'react';
import { SchemaForm } from '../common/SchemaForm';
import ErrorAlert from '../common/ErrorAlert';
import { Button } from '../ui/Button';
import { IconInbox, IconSave } from '../ui/icons';
import questionsSchema from '../../schemas/questions.json';

import type {
  QuestionSetInput,
  QuestionSetOutputQuestionMap,
  ChoiceQuestion,
  MultiValuedQuestion,
  TextQuestion,
  NumericQuestion,
} from '../../api/models';

type Props = {
  questionMap: QuestionSetOutputQuestionMap;
  examplesByQuestion: { [key: string]: string[] };
  onUpdateQuestionSet: (next: QuestionSetInput) => Promise<void> | void;
  updating?: boolean;
  updateError?: unknown;
};

const truncate = (s: string, max = 30) => {
  if (typeof s !== 'string') return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

const QuestionsTable: React.FC<Props> = ({
  questionMap,
  examplesByQuestion,
  onUpdateQuestionSet,
  updating,
  updateError,
}) => {
  const [localMap, setLocalMap] = useState<QuestionSetOutputQuestionMap>({});

  // Sync local editable map with source
  useEffect(() => {
    setLocalMap(questionMap ?? {});
  }, [questionMap]);

  // Natural sort of question IDs: q1, q2, q10 ...
  const ids = useMemo(
    () =>
      Object.keys(localMap ?? {}).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      ),
    [localMap]
  );

  // Dumb schema selection: choose root subschema by type, attach all definitions so refs resolve
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
            <h1 className="text-2xl font-bold flex items-center justify-center"><IconInbox className='m-2' /> No questions</h1>
            <p className="py-2 opacity-70">Upload submissions to infer questions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
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
          {ids.map((qid) => {
            const def = localMap[qid] as ChoiceQuestion | MultiValuedQuestion | TextQuestion | NumericQuestion | any;
            const type = (def?.type as string) ?? 'TEXT';
            const rootSchema = selectRootSchema(type);
            const examples = examplesByQuestion[qid] ?? [];

            return (
              <tr key={qid}>
                <td className="align-top">
                  <span className="font-mono text-sm">{qid}</span>
                </td>

                <td className="align-top">
                  <select
                    className="select select-bordered select-sm"
                    value={type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      // Keep frontend dumb: only change the type; config/options are edited via the form
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
                </td>

                <td className="align-top">
                  {rootSchema ? (
                    <div className="max-w-xl">
                      <SchemaForm<any>
                        // Attach entire questions schema under definitions so "#/definitions/..." refs resolve
                        schema={{ ...rootSchema, definitions: questionsSchema as any }}
                        uiSchema={{
                          'ui:title': '',
                          'ui:options': { label: true },
                          "ui:submitButtonOptions": { norender: true },
                          type: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
                        }}
                        formData={def as any} // pass current def as-is
                        onChange={({ formData }) => {
                          // Shallow-merge; preserve current type
                          const next = { ...(formData || {}), type };
                          setLocalMap((prev) => ({ ...prev, [qid]: next as any }));
                        }}
                        onSubmit={() => {}}
                        formProps={{ noHtml5Validate: true }}
                        showSubmit={false} // only one Save button per row (last column)
                      />
                    </div>
                  ) : (
                    <span className="opacity-60">No config</span>
                  )}
                </td>

                <td className="align-top">
                  {examples.length ? (
                    <ul className="list-disc ml-4 text-xs">
                      {examples.slice(0, 10).map((ex, i) => (
                        <li key={i} className="font-mono" title={ex}>
                          {truncate(ex)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="opacity-60">—</span>
                  )}
                </td>

                <td className="align-top">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={updating}
                    onClick={async () => {
                      const nextQS = buildQuestionSetInput();
                      await onUpdateQuestionSet(nextQS);
                    }}
                    leftIcon={<IconSave />}
                  >
                    {updating ? 'Saving...' : 'Save'}
                  </Button>
                  {updateError && <ErrorAlert error={updateError} className="mt-2" />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default QuestionsTable;