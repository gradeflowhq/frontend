import { Menu, Button } from '@mantine/core';
import { IconChevronDown, IconDownload } from '@tabler/icons-react';
import React from 'react';

export type ResultsDownloadDropdownProps = {
  formats: string[];
  canDownload?: boolean;
  onSelect: (format: string) => void;
  label?: string;
};

const ResultsDownloadDropdown: React.FC<ResultsDownloadDropdownProps> = ({
  formats,
  canDownload = true,
  onSelect,
  label = 'Download',
}) => {
  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <Button
          leftSection={<IconDownload size={16} />}
          rightSection={<IconChevronDown size={16} />}
          disabled={!canDownload}
        >
          {label}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {formats.map((fmt) => (
          <Menu.Item key={fmt} onClick={() => canDownload && onSelect(fmt)}>
            {fmt}
          </Menu.Item>
        ))}
        {formats.length === 0 && (
          <Menu.Item disabled>No formats available</Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};

export default ResultsDownloadDropdown;
