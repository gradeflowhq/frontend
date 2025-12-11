import React, { forwardRef } from 'react';
import { Button, type ButtonProps } from './Button';

export type LoadingButtonProps = {
  isLoading?: boolean;
  loadingLabel?: React.ReactNode;
  idleLabel?: React.ReactNode;
} & ButtonProps;

/**
 * LoadingButton: a thin wrapper over Button that normalises loading UX.
 *
 * Usage:
 *   <LoadingButton
 *     isLoading={mutation.isPending}
 *     loadingLabel="Saving..."
 *     idleLabel="Save"
 *     variant="primary"
 *     leftIcon={<IconSave />}
 *     onClick={handleSave}
 *   />
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>((props, ref) => {
  const {
    isLoading = false,
    loadingLabel,
    idleLabel,
    children,
    disabled,
    onClick,
    ...rest
  } = props;

  const content = isLoading
    ? (loadingLabel ?? children ?? 'Loading…')
    : (idleLabel ?? children);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (isLoading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <Button
      ref={ref}
      loading={isLoading}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      onClick={handleClick}
      {...rest}
    >
      {content}
    </Button>
  );
});
LoadingButton.displayName = 'LoadingButton';

export default LoadingButton;