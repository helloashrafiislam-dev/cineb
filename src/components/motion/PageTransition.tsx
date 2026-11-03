import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface PageTransitionProps {
  children: React.ReactNode;
  viewKey: string;
  className?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Soft crossfade + slide when switching main content views (tabs / filters). */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  viewKey,
  className
}) => {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        className={className}
        initial={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, y: 18, filter: 'blur(6px)' }
        }
        animate={
          reduced
            ? { opacity: 1 }
            : { opacity: 1, y: 0, filter: 'blur(0px)' }
        }
        exit={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, y: -12, filter: 'blur(4px)' }
        }
        transition={{ duration: reduced ? 0.15 : 0.4, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

interface ModalMotionProps {
  children: React.ReactNode;
  className?: string;
  onBackdropClick?: () => void;
}

/** Backdrop + panel entrance for modals / drawers. */
export const ModalMotion: React.FC<ModalMotionProps> = ({
  children,
  className,
  onBackdropClick
}) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {onBackdropClick && (
        <div className="fixed inset-0" onClick={onBackdropClick} />
      )}
      <motion.div
        className={className}
        initial={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, y: 40, scale: 0.96, filter: 'blur(8px)' }
        }
        animate={
          reduced
            ? { opacity: 1 }
            : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
        }
        exit={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, y: 24, scale: 0.98 }
        }
        transition={{ duration: reduced ? 0.15 : 0.4, ease: EASE }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
