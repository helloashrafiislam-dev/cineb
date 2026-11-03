import React from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

type RevealVariant =
  | 'fade-up'
  | 'fade-down'
  | 'fade-left'
  | 'fade-right'
  | 'scale-in'
  | 'blur-up'
  | 'slide-soft';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number | 'some' | 'all';
}

const OFFSET = 36;

function buildVariants(
  variant: RevealVariant,
  reduced: boolean | null
): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.2 } }
    };
  }

  const presets: Record<RevealVariant, Variants> = {
    'fade-up': {
      hidden: { opacity: 0, y: OFFSET, filter: 'blur(4px)' },
      visible: { opacity: 1, y: 0, filter: 'blur(0px)' }
    },
    'fade-down': {
      hidden: { opacity: 0, y: -OFFSET, filter: 'blur(4px)' },
      visible: { opacity: 1, y: 0, filter: 'blur(0px)' }
    },
    'fade-left': {
      hidden: { opacity: 0, x: OFFSET, filter: 'blur(4px)' },
      visible: { opacity: 1, x: 0, filter: 'blur(0px)' }
    },
    'fade-right': {
      hidden: { opacity: 0, x: -OFFSET, filter: 'blur(4px)' },
      visible: { opacity: 1, x: 0, filter: 'blur(0px)' }
    },
    'scale-in': {
      hidden: { opacity: 0, scale: 0.92, filter: 'blur(6px)' },
      visible: { opacity: 1, scale: 1, filter: 'blur(0px)' }
    },
    'blur-up': {
      hidden: { opacity: 0, y: 24, scale: 0.98, filter: 'blur(8px)' },
      visible: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
    },
    'slide-soft': {
      hidden: { opacity: 0, x: 28, y: 12 },
      visible: { opacity: 1, x: 0, y: 0 }
    }
  };

  return presets[variant];
}

const EASE = [0.22, 1, 0.36, 1] as const;

export const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  variant = 'fade-up',
  delay = 0,
  duration = 0.55,
  once = true,
  amount = 0.2
}) => {
  const reduced = useReducedMotion();
  const variants = buildVariants(variant, reduced);

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount, margin: '0px 0px -40px 0px' }}
      transition={{
        duration: reduced ? 0.2 : duration,
        delay: reduced ? 0 : delay,
        ease: EASE
      }}
    >
      {children}
    </motion.div>
  );
};

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  once?: boolean;
  amount?: number | 'some' | 'all';
}

export const Stagger: React.FC<StaggerProps> = ({
  children,
  className,
  stagger = 0.06,
  delayChildren = 0.05,
  once = true,
  amount = 0.15
}) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount, margin: '0px 0px -30px 0px' }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduced ? 0 : stagger,
            delayChildren: reduced ? 0 : delayChildren
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  variant?: RevealVariant;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({
  children,
  className,
  variant = 'fade-up'
}) => {
  const reduced = useReducedMotion();
  const variants = buildVariants(variant, reduced);

  return (
    <motion.div
      className={className}
      variants={variants}
      transition={{ duration: reduced ? 0.2 : 0.45, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};
