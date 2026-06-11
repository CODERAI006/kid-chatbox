import { StudentPageLayout } from '@/components/layout/StudentPageHeader';
import FactsAndFunPanel from './facts/FactsAndFunPanel';

export default function NewsFeed() {
  return (
    <StudentPageLayout
      icon="💡"
      title="Facts & Fun"
      subtitle="10 facts daily · generated for your class · saved to read anytime"
      accent="orange"
      maxW="1200px"
    >
      <FactsAndFunPanel />
    </StudentPageLayout>
  );
}
