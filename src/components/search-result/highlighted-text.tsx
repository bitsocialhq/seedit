import { useMemo } from 'react';
import { getHighlightSegments } from '../../lib/utils/search-highlight-utils';

interface HighlightedTextProps {
  /** Pre-split query terms, so a list of rows computes them once. */
  terms: string[];
  text: string | undefined | null;
}

/**
 * Renders text with every search term marked, the way the results page shows a
 * match. Segments are rendered as React children, never as markup, so indexed
 * text cannot inject HTML.
 */
const HighlightedText = ({ terms, text }: HighlightedTextProps) => {
  const segments = useMemo(() => getHighlightSegments(text ?? '', terms), [text, terms]);

  return <>{segments.map((segment, index) => (segment.match ? <mark key={index}>{segment.text}</mark> : <span key={index}>{segment.text}</span>))}</>;
};

export default HighlightedText;
