import React from 'react';
import { IconTrash, IconCheckCircle } from '../ui/Icon';
import { Button } from '../ui/Button';
import { createPortal } from 'react-dom';

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Yes',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return createPortal(
    <div className="modal modal-open z-50">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="py-4">{message}</p>
        <div className="modal-action">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="error"
            onClick={onConfirm}
            leftIcon={
              (confirmText && /delete|remove/i.test(confirmText)) ? (
                <IconTrash />
              ) : (
                <IconCheckCircle />
              )
            }
          >
            {confirmText}
          </Button>
        </div>
      </div>
      {/* Backdrop closes the modal */}
      <div className="modal-backdrop" onClick={onCancel} aria-hidden="true" />
    </div>,
    document.body
  );
};

export default ConfirmDialog;