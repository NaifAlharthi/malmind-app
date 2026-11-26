import { TabStack } from '@/components/TabStack';
import { useLocale } from '@/lib/i18n';

export default function HomeStack() {
  const { L } = useLocale();
  return <TabStack title={L('الرئيسية', 'Home')} />;
}
