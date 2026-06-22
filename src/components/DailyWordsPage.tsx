import { StudentPageLayout } from '@/components/layout/StudentPageHeader';
import { WordsOfDayPanel } from './wordOfDay/WordsOfDayPanel';

export default function DailyWordsPage() {
  return (
    <StudentPageLayout
      icon="📚"
      title="Words of the Day"
      subtitle="All vocabulary saved for your class — filter by date anytime"
      accent="purple"
      maxW="1200px"
    >
      <WordsOfDayPanel />
    </StudentPageLayout>
  );
}
