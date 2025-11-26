export const ENGINE_KEYS = ['question_types', 'constraints'] as const;
export const HIDE_KEYS_DEFAULT = ['type', ...ENGINE_KEYS] as const;
export const HIDE_KEYS_SINGLE = ['question_id', ...HIDE_KEYS_DEFAULT] as const;
export const HIDE_KEYS_MULTI = HIDE_KEYS_DEFAULT;