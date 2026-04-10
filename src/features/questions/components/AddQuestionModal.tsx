import { Alert, Button, Combobox, Group, Input, InputBase, Modal, Select, useCombobox } from '@mantine/core';
import React, { useEffect, useState } from 'react';

import { QUESTION_TYPES } from '@features/questions/constants';
import { getErrorMessage } from '@utils/error';

interface Props {
  opened: boolean;
  existingIds: string[];
  submissionQids?: string[];
  isSaving?: boolean;
  error?: unknown;
  onClose: () => void;
  onAdd: (questionId: string, questionType: string) => void;
}

const AddQuestionModal: React.FC<Props> = ({
  opened,
  existingIds,
  submissionQids = [],
  isSaving,
  error,
  onClose,
  onAdd,
}) => {
  const [questionId, setQuestionId] = useState('');
  const [questionType, setQuestionType] = useState<string>('TEXT');

  const combobox = useCombobox();

  // Reset local form state whenever the modal opens or closes so parent-driven
  // updates do not briefly surface duplicate-ID or stale server errors.
  useEffect(() => {
    setQuestionId('');
    setQuestionType('TEXT');
  }, [opened]);

  const trimmedQuestionId = questionId.trim();

  const idError = opened && !isSaving && trimmedQuestionId
    ? existingIds.includes(trimmedQuestionId)
      ? 'A question with this ID already exists.'
      : submissionQids.length > 0 && !submissionQids.includes(trimmedQuestionId)
        ? 'Question ID must match a question found in the uploaded submissions.'
      : undefined
    : undefined;

  const handleSubmit = () => {
    const id = trimmedQuestionId;
    if (!id || idError) return;
    onAdd(id, questionType);
  };

  const handleClose = () => {
    setQuestionId('');
    setQuestionType('TEXT');
    onClose();
  };

  const filteredOpts = submissionQids.filter((qid) =>
    !questionId.trim() || qid.toLowerCase().includes(questionId.toLowerCase()),
  );

  return (
    <Modal opened={opened} onClose={handleClose} title="Add Question" size="sm">
      {submissionQids.length > 0 ? (
        <Combobox
          store={combobox}
          onOptionSubmit={(val) => {
            setQuestionId(val);
            combobox.closeDropdown();
          }}
        >
          <Combobox.Target>
            <InputBase
              label="Question ID"
              placeholder="Type or select from submissions"
              value={questionId}
              onChange={(e) => {
                setQuestionId(e.currentTarget.value);
                combobox.openDropdown();
              }}
              onClick={() => combobox.openDropdown()}
              onFocus={() => combobox.openDropdown()}
              onBlur={() => combobox.closeDropdown()}
              error={idError}
              mb="sm"
              data-autofocus
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
            />
          </Combobox.Target>

          <Combobox.Dropdown>
            <Combobox.Options>
              {filteredOpts.length === 0 ? (
                <Combobox.Empty>No matching submission questions</Combobox.Empty>
              ) : (
                filteredOpts.map((qid) => (
                  <Combobox.Option value={qid} key={qid}>
                    {qid}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      ) : (
        <Input.Wrapper label="Question ID" error={idError} mb="sm">
          <Input
            placeholder="e.g. Q1, question_1"
            value={questionId}
            onChange={(e) => setQuestionId(e.currentTarget.value)}
            data-autofocus
          />
        </Input.Wrapper>
      )}

      <Select
        label="Type"
        data={[...QUESTION_TYPES]}
        value={questionType}
        onChange={(v) => setQuestionType(v ?? 'TEXT')}
        mb="md"
      />

      {opened && !!error && (
        <Alert color="red" mb="sm">
          {getErrorMessage(error)}
        </Alert>
      )}

      <Group justify="flex-end" gap="sm">
        <Button variant="subtle" onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={isSaving}
          disabled={!questionId.trim() || !!idError}
        >
          Add
        </Button>
      </Group>
    </Modal>
  );
};

export default AddQuestionModal;
