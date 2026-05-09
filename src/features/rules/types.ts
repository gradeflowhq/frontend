// Rule editing is schema-driven. The frontend only needs a typed envelope
// around backend-provided rule objects and drafts.
export type RuleValue = {
  id?: string;
  type: string;
  display_name?: string;
  description?: string;
  question_id?: string;
};
