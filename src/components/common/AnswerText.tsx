import React from 'react';

type AnswerTextProps = {
  value: unknown;
  maxLength?: number;
  className?: string;
  emptyText?: string;
};

const AnswerText: React.FC<AnswerTextProps> = ({ 
  value, 
  maxLength,
  className = '',
  emptyText = '—'
}) => {
  const renderAnswer = () => {
    if (value === null || value === undefined) {
      return <span className="opacity-60">{emptyText}</span>;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="opacity-60 italic">Empty array</span>;
      }
      
      const displayValue = value.map(String);
        return (
            <ul className={`list bg-base-100 rounded-box border border-base-300 mb-2 ${className}`}>
            {displayValue.map((item, idx) => (
                <li key={idx} className='list-row'>
                <div className="font-mono text-xs opacity-50">{idx+1}</div>
                <span className="font-mono text-xs">{item}</span>
                </li>
            ))}
            </ul>
        );
    }

    // Handle primitives (string, number, boolean)
    const strValue = String(value);
    
    if (maxLength && strValue.length > maxLength) {
      const truncated = strValue.slice(0, maxLength) + '…';
      return (
        <span className={`${className}`} title={strValue}>
          {truncated}
        </span>
      );
    }

    return <span className={className}>{strValue}</span>;
  };

  return (
    <div className="whitespace-pre-wrap break-words">
      {renderAnswer()}
    </div>
  );
};

export default AnswerText;
