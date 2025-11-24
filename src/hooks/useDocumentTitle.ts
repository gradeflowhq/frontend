import { useEffect } from 'react';

export const useDocumentTitle = (title: string) => {
  useEffect(() => {
    if (title && typeof title === 'string') {
      document.title = title;
    }
  }, [title]);
};