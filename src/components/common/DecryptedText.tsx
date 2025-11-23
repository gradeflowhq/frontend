import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { decryptString, isEncrypted } from '../../utils/crypto';
import { IconLock } from '../ui/icons';

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
}) => {
  const encrypted = useMemo(() => isEncrypted(value), [value]);

  useEffect(() => {
    if (encrypted && onEncryptedDetected) onEncryptedDetected();
  }, [encrypted, onEncryptedDetected]);

  // Build cache key only when both cipher and passphrase exist
  const cacheKey = encrypted && passphrase ? `${value}::${passphrase}` : null;

  // Keep track of last resolved plaintext to use as an immediate fallback during re-renders
  const lastResolvedRef = useRef<string | null>(null);

  // Initial display:
  // - plaintext when not encrypted
  // - masked when encrypted and no passphrase
  // - cached plaintext (if available) when encrypted and passphrase exists
  const initialDisplay = useMemo(() => {
    if (!encrypted) return value;
    if (!passphrase) return maskedText;
    const cached = cacheKey ? plaintextCache.get(cacheKey) : undefined;
    if (cached) {
      lastResolvedRef.current = cached;
      return cached;
    }
    // No cache yet: if we had a previously resolved value in this instance, keep showing it
    if (lastResolvedRef.current) return lastResolvedRef.current;
    // As a last resort, show masked (will be replaced by plaintext after decrypt)
    return maskedText;
  }, [encrypted, passphrase, cacheKey, value, maskedText]);

  const [display, setDisplay] = useState<string>(initialDisplay);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Plaintext or no passphrase: set synchronously
      if (!encrypted) {
        lastResolvedRef.current = value;
        setDisplay(value);
        return;
      }
      if (!passphrase) {
        setDisplay(maskedText);
        return;
      }

      // If we already have cache, use it synchronously and skip decryption
      if (cacheKey && plaintextCache.has(cacheKey)) {
        const cached = plaintextCache.get(cacheKey)!;
        lastResolvedRef.current = cached;
        setDisplay(cached);
        return;
      }

      try {
        const plain = await decryptString(value, passphrase);
        if (cancelled) return;
        // Update cache and UI
        if (cacheKey) plaintextCache.set(cacheKey, plain);
        lastResolvedRef.current = plain;
        setDisplay(plain);
      } catch {
        if (cancelled) return;
        // On failure, keep masked. Do not overwrite prior resolved plaintext.
        setDisplay(maskedText);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // Important: include only value/passphrase/maskedText/encrypted/cacheKey
  }, [value, passphrase, maskedText, encrypted, cacheKey]);

  const classes = clsx(className, mono && 'font-mono', sizeClass(size));

  return (
    <span className={classes} title={title}>
      {display}
      {encrypted && showLockIcon && (
        <span className="inline-flex items-center tooltip ml-1" data-tip="Stored encrypted on server">
          <IconLock />
        </span>
      )}
    </span>
  );
};

export default DecryptedText;