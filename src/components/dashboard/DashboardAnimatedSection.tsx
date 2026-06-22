/**
 * Scroll-reveal wrapper for dashboard sections.
 */

import { motion, type Variants } from 'framer-motion';
import { ReactNode } from 'react';

const variants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

interface DashboardAnimatedSectionProps {
  children: ReactNode;
  delay?: number;
}

export const DashboardAnimatedSection: React.FC<DashboardAnimatedSectionProps> = ({
  children,
  delay = 0,
}) => (
  <motion.div
    variants={variants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.12 }}
    transition={{ delay }}
    style={{ width: '100%' }}
  >
    {children}
  </motion.div>
);
