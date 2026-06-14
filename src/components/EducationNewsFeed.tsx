import { StudentPageLayout } from '@/components/layout/StudentPageHeader';
import EducationTopicsPanel from './news/EducationTopicsPanel';

export default function EducationNewsFeed() {
  return (
    <StudentPageLayout
      icon="📰"
      title="Education News"
      subtitle="Science, technology, sports, history, geography & more — curated for learners"
      accent="blue"
      maxW="1200px"
    >
      <EducationTopicsPanel />
    </StudentPageLayout>
  );
}
