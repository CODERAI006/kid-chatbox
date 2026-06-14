import { StudentPageLayout } from '@/components/layout/StudentPageHeader';
import { ExpressionsPanel } from './wordOfDay/ExpressionsPanel';

export default function ExpressionsPage() {
  return (
    <StudentPageLayout
      icon="💬"
      title="Daily Expressions"
      subtitle="5 idioms daily · school & daily life · saved to review anytime"
      accent="teal"
      maxW="1200px"
    >
      <ExpressionsPanel />
    </StudentPageLayout>
  );
}
