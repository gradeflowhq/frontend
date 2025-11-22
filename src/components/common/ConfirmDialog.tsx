import React from 'react';
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
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className="btn btn-error" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
      {/* Backdrop closes the modal */}
      <div className="modal-backdrop" onClick={onCancel} aria-hidden="true" />
    </div>,
    document.body
  );
};

export default ConfirmDialog;