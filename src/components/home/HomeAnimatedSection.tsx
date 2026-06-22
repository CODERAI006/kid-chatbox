/**
 * Scroll-reveal wrapper for landing page sections.
 */

import { motion, type Variants } from 'framer-motion';
import { ReactNode } from 'react';

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

interface HomeAnimatedSectionProps {
  children: ReactNode;
  id?: string;
  delay?: number;
  className?: string;
}

export const HomeAnimatedSection: React.FC<HomeAnimatedSectionProps> = ({
  children,
  id,
  delay = 0,
}) => (
  <motion.section
    id={id}
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.15 }}
    transition={{ delay }}
    style={{ scrollMarginTop: '88px', width: '100%' }}
  >
    {children}
  </motion.section>
);
