import { TabStack } from '@/components/TabStack';
import { useLocale } from '@/lib/i18n';

export default function ToolboxStack() {
  const { L } = useLocale();
  return <TabStack title={L('الأدوات', 'Toolbox')} />;
}
