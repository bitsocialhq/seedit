import { describe, expect, it } from 'vitest';
import type { IAceEditorProps } from 'react-ace';
import { normalizeReactAceModule } from './react-ace-utils';

const AceEditor = (_props: IAceEditorProps) => null;

describe('normalizeReactAceModule', () => {
  it('preserves a standard default component export', () => {
    expect(normalizeReactAceModule({ default: AceEditor })).toEqual({ default: AceEditor });
  });

  it('unwraps a CommonJS default export nested by Vite interop', () => {
    expect(normalizeReactAceModule({ default: { default: AceEditor } })).toEqual({ default: AceEditor });
  });
});
