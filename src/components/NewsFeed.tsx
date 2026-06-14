import { StudentPageLayout } from '@/components/layout/StudentPageHeader';
import FactsAndFunPanel from './facts/FactsAndFunPanel';

export default function NewsFeed() {
  return (
    <StudentPageLayout
      icon="💡"
      title="Facts & Fun"
      subtitle="10 new facts every day · refreshes after midnight · saved to read anytime"
      accent="orange"
      maxW="1200px"
    >
      <FactsAndFunPanel />
    </StudentPageLayout>
  );
}
