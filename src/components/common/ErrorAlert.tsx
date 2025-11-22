import React from 'react';
import { getErrorMessages } from '../../utils/error';

type ErrorAlertProps = {
  error: unknown;
  title?: string;
  className?: string;
};

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, title = 'Error', className }) => {
  const messages = getErrorMessages(error);

  return (
    <div className={`alert alert-error ${className ?? ''}`}>
      <div>
        <span className="font-semibold mr-2">{title}:</span>
        {messages.length === 1 ? (
          <span>{messages[0]}</span>
        ) : (
          <ul className="list-disc ml-4">
            {messages.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;