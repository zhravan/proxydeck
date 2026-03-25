import {
  forwardRef,
  useCallback,
  useId,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from "react";

/** Oat / native `<dialog>` shell for forms (see https://oat.ink/components/dialog/). */
export type OatFormModalHandle = {
  showModal: () => void;
  close: () => void;
};

export type OatFormModalProps = {
  title: string;
  description?: ReactNode;
  /** Shown between header and footer; keep forms scrollable inside the body. */
  children: ReactNode;
  footer?: ReactNode;
  /** Fires when the dialog closes (backdrop, Escape, or programmatic `close`). */
  onClose?: () => void;
};

export const OatFormModal = forwardRef<OatFormModalHandle, OatFormModalProps>(function OatFormModal(
  { title, description, children, footer, onClose },
  forwardedRef
) {
  const dlgRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useImperativeHandle(forwardedRef, () => ({
    showModal: () => dlgRef.current?.showModal(),
    close: () => dlgRef.current?.close(),
  }));

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleDismiss = useCallback(() => {
    dlgRef.current?.close();
  }, []);

  return (
    <dialog
      ref={dlgRef}
      className="pd-form-modal"
      aria-labelledby={titleId}
      onClose={handleClose}
      closedby="any"
    >
      <div className="pd-form-modal__inner">
        <header className="pd-form-modal__header">
          <div className="pd-form-modal__title-block">
            <h2 id={titleId} className="pd-form-modal__title">
              {title}
            </h2>
            {description ? (
              <div className="text-light pd-form-modal__description">{description}</div>
            ) : null}
          </div>
          <button type="button" className="outline small pd-form-modal__close" onClick={handleDismiss} aria-label="Close">
            ×
          </button>
        </header>
        <div className="pd-form-modal__body">{children}</div>
        {footer ? <footer className="pd-form-modal__footer">{footer}</footer> : null}
      </div>
    </dialog>
  );
});
