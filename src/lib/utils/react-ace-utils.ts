import type { ComponentType } from 'react';
import type { IAceEditorProps } from 'react-ace';

type AceEditorComponent = ComponentType<IAceEditorProps>;

type ReactAceModule = {
  default: AceEditorComponent | { default: AceEditorComponent };
};

export const normalizeReactAceModule = (module: ReactAceModule): { default: AceEditorComponent } => {
  const editor = module.default;

  return { default: typeof editor === 'function' ? editor : editor.default };
};
