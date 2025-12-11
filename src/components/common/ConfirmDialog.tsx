import React from 'react';
import { IconTrash, IconCheckCircle } from '../ui/Icon';
import LoadingButton from '../ui/LoadingButton';
import { Button } from '../ui/Button';
import Modal from './Modal';

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmLoading?: boolean;
  confirmLoadingLabel?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Yes',
  cancelText = 'Cancel',
  confirmLoading = false,
  confirmLoadingLabel,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal open={open} onClose={onCancel}>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="py-4">{message}</p>
      <div className="modal-action">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {cancelText}
        </Button>
        <LoadingButton
          type="button"
          variant="error"
          isLoading={confirmLoading}
          loadingLabel={confirmLoadingLabel}
          onClick={onConfirm}
          leftIcon={
            confirmText && /delete|remove/i.test(confirmText) ? (
              <IconTrash />
            ) : (
              <IconCheckCircle />
            )
          }
        >
          {confirmText}
        </LoadingButton>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;