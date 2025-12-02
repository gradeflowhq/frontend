import React, { forwardRef } from 'react';
import clsx from 'clsx';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral'
  | 'ghost'
  | 'outline'
  | 'link'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  title?: string;
};

export type ButtonProps<E extends React.ElementType = 'button'> = CommonProps & {
  as?: E;
} & Omit<React.ComponentPropsWithoutRef<E>, 'as' | 'children' | 'className' | 'disabled'>;

const variantClass = (v: ButtonVariant = 'primary') => {
  switch (v) {
    case 'primary': return 'btn btn-primary';
    case 'secondary': return 'btn btn-secondary';
    case 'accent': return 'btn btn-accent';
    case 'neutral': return 'btn btn-neutral';
    case 'ghost': return 'btn btn-ghost';
    case 'outline': return 'btn btn-outline';
    case 'link': return 'btn btn-link';
    case 'success': return 'btn btn-success';
    case 'warning': return 'btn btn-warning';
    case 'error': return 'btn btn-error';
    case 'info': return 'btn btn-info';
    default: return 'btn';
  }
};

const sizeClass = (s: ButtonSize = 'md') => {
  switch (s) {
    case 'xs': return 'btn-xs';
    case 'sm': return 'btn-sm';
    case 'md': return '';
    case 'lg': return 'btn-lg';
    default: return '';
  }
};

export const Button = forwardRef<any, ButtonProps>((props, ref) => {
  const {
    as: Comp = 'button',
    variant = 'primary',
    size = 'md',
    fullWidth,
    loading,
    disabled,
    className,
    leftIcon,
    rightIcon,
    children,
    title,
    ...rest
  } = props;

  const classes = clsx(
    variantClass(variant),
    sizeClass(size),
    fullWidth && 'w-full',
    className
  );

  const isDisabled = disabled || loading;

  return (
    <Comp
      ref={ref}
      className={classes}
      title={title}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <span className="loading loading-spinner loading-xs" />
          {typeof children === 'string' ? children : children ?? 'Loading…'}
        </>
      ) : (
        <>
          {leftIcon ? <span className="inline-flex items-center">{leftIcon}</span> : null}
          {children}
          {rightIcon ? <span className="inline-flex items-center">{rightIcon}</span> : null}
        </>
      )}
    </Comp>
  );
});
Button.displayName = 'Button';