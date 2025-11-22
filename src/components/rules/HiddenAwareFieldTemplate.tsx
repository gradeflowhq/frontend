import React from 'react';
import type { FieldTemplateProps } from '@rjsf/utils';
import { Theme as DaisyUITheme } from '@rjsf/daisyui';

type GlobalHideContext = {
  hideKeys?: Set<string>;
};

const getFieldKey = (props: FieldTemplateProps): string | null => {
    const id_parts = props.id.split('_').filter(Boolean);
    const label_parts = props.label?.toString().split(' ').filter(Boolean) || [];
    const key = id_parts.slice(-label_parts.length).join('_');
    return key || null;
};

const DefaultFieldTemplate = DaisyUITheme.templates?.FieldTemplate;

const HiddenAwareFieldTemplate: React.FC<FieldTemplateProps> = (props) => {
  // Local per-node hide flag
  const localHidden = props.uiSchema?.['ui:options']?.hidden === true;

  // Global flat hide-by-key from formContext
  const ctx = (props.registry?.formContext || {}) as GlobalHideContext;
  const key = getFieldKey(props);
  const globalHidden = key && ctx.hideKeys instanceof Set ? ctx.hideKeys.has(key) : false;

  if (localHidden || globalHidden) return null;

  return <DefaultFieldTemplate {...props} />;
};

export default HiddenAwareFieldTemplate;