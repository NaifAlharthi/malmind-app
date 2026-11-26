import { TabStack } from '@/components/TabStack';
import { useLocale } from '@/lib/i18n';

export default function LogStack() {
  const { L } = useLocale();
  return <TabStack title={L('السِّجل', 'The Log')} />;
}
