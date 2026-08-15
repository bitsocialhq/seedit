export const configureDevelopmentMockContent = async () => {
  if (!import.meta.env.DEV) return;

  const { getDevelopmentDebugPreferences } = await import('../stores/use-development-debug-store');
  if (!getDevelopmentDebugPreferences().mockContentEnabled) return;

  const [{ setPkcJs }, { default: PkcJsMockContent }] = await Promise.all([
    import('@bitsocial/bitsocial-react-hooks/dist/lib/pkc-js/index.js'),
    import('@bitsocial/bitsocial-react-hooks/dist/lib/pkc-js/pkc-js-mock-content.js'),
  ]);
  setPkcJs(PkcJsMockContent);
};
