export const assessmentFormUiSchema = {
  'ui:title': '',
  'ui:options': { label: true },
  'ui:submitButtonOptions': { norender: true },
  name: { 'ui:options': { inputType: 'text' } },
  description: { 'ui:options': { inputType: 'text' } },
} as const;
