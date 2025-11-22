import { useEffect } from 'react';

export const useDocumentTitle = (title: string, deps: any[] = []) => {
  useEffect(() => {
    if (title && typeof title === 'string') {
      document.title = title;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};