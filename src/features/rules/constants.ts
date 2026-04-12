const RULE_EDITOR_METADATA_KEYS = ['name', 'type', 'dtype', 'question_types', 'constraints'] as const;

// question_id must be hidden in the editor UI for single-target rules
// (it is populated programmatically and shown as a header badge, not edited by the user)
export const HIDE_KEYS_SINGLE = ['question_id', ...RULE_EDITOR_METADATA_KEYS] as const;
export const HIDE_KEYS_MULTI = [...RULE_EDITOR_METADATA_KEYS] as const;
export const RULE_RENDER_HIDDEN_KEYS = ['question_id', 'description', ...RULE_EDITOR_METADATA_KEYS] as const;