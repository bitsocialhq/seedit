const SUPPORTED_CHAIN_PROVIDER_TICKERS: ReadonlySet<string> = new Set(['eth']);

export const getSupportedChainProviders = <T>(chainProviders: Record<string, T> | undefined): Record<string, T> | undefined => {
  if (!chainProviders) return undefined;

  const supportedChainProviders: Record<string, T> = {};
  for (const [ticker, provider] of Object.entries(chainProviders)) {
    if (SUPPORTED_CHAIN_PROVIDER_TICKERS.has(ticker)) supportedChainProviders[ticker] = provider;
  }
  return supportedChainProviders;
};
