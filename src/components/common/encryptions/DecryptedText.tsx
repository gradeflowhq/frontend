import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { decryptString, isEncrypted } from '@utils/crypto';
import { IconLock } from '@components/ui/Icon';

// Global cache to avoid flicker and repeated decrypts across re-renders/components
// Keyed by `${cipher}::${passphrase}`
const plaintextCache = new Map<string, string>();

type DecryptedTextProps = {
  value: string;
  passphrase?: string | null;
  maskedText?: string;            // default: '••••'
  className?: string;
  mono?: boolean;
  size?: 'xs' | 'sm' | 'md';
  showLockIcon?: boolean;
  onEncryptedDetected?: () => void;
  title?: string;
  showSkeletonWhileDecrypting?: boolean; // render a skeleton while decrypting async
};

const sizeClass = (s: 'xs' | 'sm' | 'md' = 'md') =>
  s === 'xs' ? 'text-xs' : s === 'sm' ? 'text-sm' : '';

const DecryptedText: React.FC<DecryptedTextProps> = ({
  value,
  passphrase,
  maskedText = '••••',
  className,
  mono = true,
  size = 'sm',
  showLockIcon = true,
  onEncryptedDetected,
  title,
  showSkeletonWhileDecrypting = false,
}) => {
  const encrypted = useMemo(() => isEncrypted(value), [value]);

  useEffect(() => {
    if (encrypted && onEncryptedDetected) onEncryptedDetected();
  }, [encrypted, onEncryptedDetected]);

  // Build cache key only when both cipher and passphrase exist
  const cacheKey = encrypted && passphrase ? `${value}::${passphrase}` : null;

  // Keep track of last resolved plaintext to use as an immediate fallback during re-renders
  const [lastResolved, setLastResolved] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Initial display:
  // - plaintext when not encrypted
  // - masked when encrypted and no passphrase
  // - cached plaintext (if available) when encrypted and passphrase exists
  const initialDisplay = useMemo(() => {
    if (!encrypted) return value;
    if (!passphrase) return maskedText;
    const cached = cacheKey ? plaintextCache.get(cacheKey) : undefined;
    if (cached) return cached;
    if (lastResolved) return lastResolved;
    return maskedText;
  }, [encrypted, passphrase, cacheKey, value, maskedText, lastResolved]);

  const [display, setDisplay] = useState<string>(initialDisplay);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Plaintext or no passphrase: set synchronously
      if (!encrypted) {
        setLastResolved(value);
        setDisplay(value);
        setIsDecrypting(false);
        return;
      }

      if (!passphrase) {
        setDisplay(maskedText);
        setIsDecrypting(false);
        return;
      }

      if (cacheKey && plaintextCache.has(cacheKey)) {
        const cached = plaintextCache.get(cacheKey)!;
        setLastResolved(cached);
        setDisplay(cached);
        setIsDecrypting(false);
        return;
      }

      setIsDecrypting(true);
      try {
        const plain = await decryptString(value, passphrase);
        if (cancelled) return;
        if (cacheKey) plaintextCache.set(cacheKey, plain);
        setLastResolved(plain);
        setDisplay(plain);
        setIsDecrypting(false);
      } catch {
        if (cancelled) return;
        setDisplay(maskedText);
        setIsDecrypting(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // Important: include only value/passphrase/maskedText/encrypted/cacheKey
  }, [value, passphrase, maskedText, encrypted, cacheKey]);

  const classes = clsx(className, mono && 'font-mono', sizeClass(size));

  return (
    <span className={classes} title={title}>
      {isDecrypting && showSkeletonWhileDecrypting ? (
        <span className="skeleton inline-block h-4 w-20 align-middle" aria-label="Decrypting" />
      ) : (
        <>
          {display}
          {encrypted && showLockIcon && (
            <span className="inline-flex items-center tooltip ml-1" data-tip="Stored encrypted on server">
              <IconLock />
            </span>
          )}
        </>
      )}
    </span>
  );
};

export default DecryptedText;