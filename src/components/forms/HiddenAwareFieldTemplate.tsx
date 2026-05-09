import { Theme as MantineTheme } from '@rjsf/mantine';
import React from 'react';

import type { FieldTemplateProps } from '@rjsf/utils';

const DefaultFieldTemplate =
  MantineTheme.templates?.FieldTemplate as React.ComponentType<FieldTemplateProps> | undefined;

const HiddenAwareFieldTemplate: React.FC<FieldTemplateProps> = (props) => {
  if (props.uiSchema?.['ui:options']?.hidden === true) return null;

  if (!DefaultFieldTemplate) return null;

  return <DefaultFieldTemplate {...props} />;
};

export default HiddenAwareFieldTemplate;
