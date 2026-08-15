import { lazy, Suspense } from 'react';

interface DevelopmentFeedResetButtonProps {
  onReset: () => void;
}

const ResetButton = import.meta.env.DEV ? lazy(() => import('./development-feed-reset-button')) : null;

const DevelopmentFeedResetButton = (props: DevelopmentFeedResetButtonProps) => {
  if (!ResetButton) return null;

  return (
    <Suspense fallback={null}>
      <ResetButton {...props} />
    </Suspense>
  );
};

export default DevelopmentFeedResetButton;
