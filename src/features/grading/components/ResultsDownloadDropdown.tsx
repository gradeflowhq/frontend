import React from 'react';
import { DropdownMenu } from '@components/ui/DropdownMenu';
import { Button } from '@components/ui/Button';
import { IconChevronDown, IconDownload } from '@components/ui/Icon';

export type ResultsDownloadDropdownProps = {
  formats: string[];
  canDownload?: boolean;
  onSelect: (format: string) => void;
  className?: string;
  label?: string;
  align?: 'start' | 'end';
};

const ResultsDownloadDropdown: React.FC<ResultsDownloadDropdownProps> = ({
  formats,
  canDownload = true,
  onSelect,
  className,
  label = 'Download',
  align = 'end',
}) => {
  return (
    <DropdownMenu
      align={align}
      className={className}
      trigger={
        <>
          <IconDownload />
          {label}
          <IconChevronDown />
        </>
      }
    >
      <>
        {formats.map((fmt) => (
          <li key={fmt}>
            <Button
              variant="ghost"
              className="justify-start"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => canDownload && onSelect(fmt)}
              disabled={!canDownload}
              title={`Download as ${fmt}`}
            >
              {fmt}
            </Button>
          </li>
        ))}
        {formats.length === 0 && (
          <li>
            <span className="opacity-70 px-2 py-1">No formats available</span>
          </li>
        )}
      </>
    </DropdownMenu>
  );
};

export default ResultsDownloadDropdown;