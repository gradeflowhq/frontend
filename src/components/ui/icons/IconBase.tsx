import React, { forwardRef } from 'react';
import type { SVGProps } from 'react';
import clsx from 'clsx';

// Consistent size mapping for Tailwind/DaisyUI utility sizing
const sizeToClass = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;

export type IconSize = keyof typeof sizeToClass;

export type IconBaseProps = SVGProps<SVGSVGElement> & {
  size?: IconSize;
  title?: string;        // For accessibility tooltips
  decorative?: boolean;  // If true, set aria-hidden automatically
  className?: string;
};

export const IconBase = forwardRef<SVGSVGElement, IconBaseProps>(
  ({ size = 'sm', className, decorative = true, title, ...rest }, ref) => {
    const classes = clsx(sizeToClass[size], className);

    // aria-hidden for purely decorative icons
    const ariaHidden = decorative ? true : undefined;

    // Consumers pass children: the actual icon (Fi* component) is rendered by specific wrappers
    return (
      <svg
        ref={ref}
        role={decorative ? 'img' : 'img'}
        aria-hidden={ariaHidden}
        className={classes}
        {...rest}
      >
        {title ? <title>{title}</title> : null}
      </svg>
    );
  }
);
IconBase.displayName = 'IconBase';