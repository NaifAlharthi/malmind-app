import { TabStack } from '@/components/TabStack';
import { useLocale } from '@/lib/i18n';

export default function BrainStack() {
  const { L } = useLocale();
  return <TabStack title={L('العقل', 'The Brain')} large={false} />;
}
