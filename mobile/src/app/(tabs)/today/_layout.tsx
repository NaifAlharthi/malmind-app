import { TabStack } from '@/components/TabStack';
import { useLocale } from '@/lib/i18n';

export default function TodayStack() {
  const { L } = useLocale();
  return <TabStack title={L('مؤشّراتك الحيوية', 'Vital signs')} />;
}
