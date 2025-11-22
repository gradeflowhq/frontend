import React from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
  open: boolean;
  children: React.ReactNode;
  onClose?: () => void;
  boxClassName?: string;
};

const Modal: React.FC<ModalProps> = ({ open, children, onClose, boxClassName }) => {
  if (!open) return null;

  return createPortal(
    <div className="modal modal-open z-50">
      <div className={`modal-box ${boxClassName ?? ''}`}>{children}</div>
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
    </div>,
    document.body
  );
};

export default Modal;