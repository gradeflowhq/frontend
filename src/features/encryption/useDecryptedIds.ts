import { useEffect, useMemo, useState } from 'react';

import { decryptString, isEncrypted } from '@utils/crypto';

// Cache decrypted strings per cipher+passphrase to avoid repeated work.
const cache = new Map<string, string>();

/**
 * Decrypt a list of values (typically student IDs) with memoization.
 * - Keeps original value when not encrypted or when decryption fails.
 * - Triggers onEncryptedDetected when any encrypted value is present.
 * - Exposes isDecrypting so callers can show a skeleton/loader.
 */
export const useDecryptedIds = (
  values: string[],
  passphrase?: string | null,
  onEncryptedDetected?: () => void
): { decryptedIds: Record<string, string>; isDecrypting: boolean } => {
  const normalized = useMemo(() => Array.from(new Set(values.filter(Boolean))), [values]);
  const depsKey = useMemo(() => normalized.join('|'), [normalized]);
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hasEncrypted = normalized.some((v) => isEncrypted(v));
    if (hasEncrypted && onEncryptedDetected) {
      onEncryptedDetected();
    }

    const run = async () => {
      setIsDecrypting(hasEncrypted && Boolean(passphrase));

      const entries = await Promise.all(
        normalized.map(async (v) => {
          if (isEncrypted(v) && passphrase) {
            const cacheKey = `${v}::${passphrase}`;
            const cached = cache.get(cacheKey);
            if (cached) return [v, cached] as const;
            try {
              const plain = await decryptString(v, passphrase);
              cache.set(cacheKey, plain);
              return [v, plain] as const;
            } catch {
              return [v, v] as const;
            }
          }
          return [v, v] as const;
        })
      );

      if (!cancelled) {
        setResolved(Object.fromEntries(entries));
        setIsDecrypting(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [depsKey, passphrase, onEncryptedDetected, normalized]);

  return { decryptedIds: resolved, isDecrypting };
};
