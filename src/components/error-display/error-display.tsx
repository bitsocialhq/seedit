import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { copyToClipboard } from '../../lib/utils/clipboard-utils';
import styles from './error-display.module.css';

type ErrorDetails = {
  message?: string;
  stack?: string;
  details?: unknown;
};

const getErrorDetails = (error: unknown): ErrorDetails | null => {
  if (!error) return null;
  if (typeof error === 'string') {
    return { message: error };
  }
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (typeof error === 'object') {
    const maybeError = error as { message?: unknown; stack?: unknown; details?: unknown };
    return {
      message: typeof maybeError.message === 'string' ? maybeError.message : undefined,
      stack: typeof maybeError.stack === 'string' ? maybeError.stack : undefined,
      details: maybeError.details,
    };
  }
  return { message: String(error) };
};

const stringifyError = (error: unknown) => {
  if (error instanceof Error) {
    return JSON.stringify({ name: error.name, message: error.message, stack: error.stack }, null, 2);
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};

const ErrorDisplay = ({ error }: { error: unknown }) => {
  const { t } = useTranslation();
  const [feedbackMessageKey, setFeedbackMessageKey] = useState<string | null>(null);
  const errorDetails = getErrorDetails(error);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const originalDisplayMessage = errorDetails?.message ? `${t('error')}: ${errorDetails.message}` : null;

  const clearFeedbackTimeout = () => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  const scheduleFeedbackReset = () => {
    clearFeedbackTimeout();
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackMessageKey(null);
      feedbackTimeoutRef.current = null;
    }, 1500);
  };

  useEffect(() => {
    return () => {
      clearFeedbackTimeout();
    };
  }, []);

  const handleMessageClick = async () => {
    if (!errorDetails?.message || feedbackMessageKey) return;

    const errorString = stringifyError(error);
    try {
      await copyToClipboard(errorString);
      setFeedbackMessageKey('copied');
      scheduleFeedbackReset();
    } catch (err) {
      console.error('Failed to copy error: ', err);
      setFeedbackMessageKey('failed');
      scheduleFeedbackReset();
    }
  };

  let currentDisplayMessage = '';
  const classNames = [styles.errorMessage];
  let isClickable = false;

  if (feedbackMessageKey === 'copied') {
    currentDisplayMessage = t('fullErrorCopiedToClipboard', 'full error copied to the clipboard');
    classNames.pop();
    classNames.push(styles.feedbackSuccessMessage);
  } else if (feedbackMessageKey === 'failed') {
    currentDisplayMessage = t('copyFailed', 'copy failed');
  } else if (originalDisplayMessage) {
    currentDisplayMessage = originalDisplayMessage;
    isClickable = true;
    classNames.push(styles.clickableErrorMessage);
  }

  const shouldRender = Boolean(errorDetails?.message || errorDetails?.stack || errorDetails?.details || error);

  return (
    shouldRender && (
      <div className={styles.error}>
        {currentDisplayMessage && (
          <span
            className={classNames.join(' ')}
            onClick={isClickable ? handleMessageClick : undefined}
            title={isClickable ? t('clickToCopyFullError', 'Click to copy full error') : undefined}
          >
            {currentDisplayMessage}
          </span>
        )}
      </div>
    )
  );
};

export default ErrorDisplay;
