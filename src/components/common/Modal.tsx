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
    <dialog className="modal" open>
      <div className={`modal-box ${boxClassName ?? ''}`}>{children}</div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button aria-label="Close" />
      </form>
    </dialog>,
    document.body
  );
};

export default Modal;