import React from 'react';

export type Step = 'upload' | 'configure' | 'list';

export const StepIndicator: React.FC<{
  current: Step;
  hasSource: boolean;
  hasSubmissions: boolean;
  onNavigate: (step: Step) => void;
}> = ({ current, hasSource, hasSubmissions, onNavigate }) => {
  const items: { key: Step; label: string; enabled: boolean }[] = [
    { key: 'upload', label: 'Upload Data', enabled: true },
    { key: 'configure', label: 'Configure Columns', enabled: hasSource },
    { key: 'list', label: 'Preview', enabled: hasSubmissions },
  ];
  const currentIdx = items.findIndex((s) => s.key === current);
  return (
    <ul className="steps steps-horizontal w-full mb-6">
      {items.map((item, i) => (
        <li
          key={item.key}
          role="button"
          tabIndex={item.enabled ? 0 : -1}
          className={`step${i <= currentIdx ? ' step-primary' : ''}${item.enabled ? ' cursor-pointer' : ''}`}
          onClick={() => item.enabled && onNavigate(item.key)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && item.enabled && onNavigate(item.key)}
        >
          <span className={`text-sm${i === currentIdx ? ' font-semibold' : item.enabled ? ' opacity-70' : ' opacity-40'}`}>
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
};
