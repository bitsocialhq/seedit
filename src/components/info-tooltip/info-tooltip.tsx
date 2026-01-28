import { useState, useLayoutEffect, useRef } from 'react';
import { useFloating, autoUpdate, offset, shift, size, useHover, useFocus, useDismiss, useRole, useInteractions, FloatingPortal, safePolygon } from '@floating-ui/react';
import styles from './info-tooltip.module.css';

interface InfoTooltipProps {
  content: string;
  showTooltip?: boolean;
}

const InfoTooltip = ({ content, showTooltip = true }: InfoTooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Handle opening and closing with animations
  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Opening: show immediately and set open state
      setIsVisible(true);
      setIsOpen(true);
      setIsExiting(false);
      // Clear any pending exit timeout
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = undefined;
      }
    } else {
      // Closing: start exit animation, then hide after animation completes
      setIsOpen(false);
      setIsExiting(true);

      // Remove from DOM after exit animation completes (200ms)
      exitTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setIsExiting(false);
      }, 200);
    }
  };

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: handleOpenChange,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset({ mainAxis: 12 }), // 5px lower (7+5=12), 10px to the left (-10)
      shift(),
      size({
        apply({ availableWidth, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${Math.min(availableWidth, 460)}px`, // 35em ≈ 560px with 20px right padding
          });
        },
      }),
    ],
  });

  // Calculate triangle position dynamically
  useLayoutEffect(() => {
    if (isOpen && refs.reference.current && refs.floating.current) {
      const referenceRect = refs.reference.current.getBoundingClientRect();
      const floatingRect = refs.floating.current.getBoundingClientRect();

      // Calculate the horizontal center of the reference element relative to the floating element
      const referenceCenterX = referenceRect.left + referenceRect.width / 2;
      const floatingLeftX = floatingRect.left;
      const triangleLeft = referenceCenterX - floatingLeftX;

      // Set CSS custom properties for triangle positioning
      // Keep the 1px offset between border and fill triangles for proper border effect
      refs.floating.current.style.setProperty('--triangle-left-border', `${Math.max(0, triangleLeft - 2)}px`);
      refs.floating.current.style.setProperty('--triangle-left-fill', `${Math.max(1, triangleLeft - 1)}px`);
    }
  }, [isOpen, refs.reference, refs.floating, floatingStyles]);

  const hover = useHover(context, {
    move: false,
    delay: { open: 200, close: 1000 },
    handleClose: safePolygon(),
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  // Clean up timeout on unmount
  useLayoutEffect(() => {
    return () => {
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <sup className={styles.tooltipIcon} ref={refs.setReference} {...getReferenceProps()}>
        [?]
      </sup>
      {showTooltip && (
        <FloatingPortal>
          {isVisible && (
            <div className={`${styles.tooltip} ${isExiting ? styles.exiting : ''}`} ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
              <div className={styles.tooltipInner}>
                <p className={styles.tooltipContent}>{content}</p>
              </div>
            </div>
          )}
        </FloatingPortal>
      )}
    </>
  );
};

export default InfoTooltip;
