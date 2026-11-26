// The Taptic Engine, in five words the app speaks. Each is fire-and-forget
// and silent where there is no engine (the browser preview).

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const ON = Platform.OS === 'ios' || Platform.OS === 'android';
const fire = (p: () => Promise<void>) => { if (ON) p().catch(() => {}); };

export const haptic = {
  /** a button or card pressed */
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** something opened or folded — a drawer, a table */
  firm: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** a choice moved — a segment, a chip, the month stepper */
  select: () => fire(() => Haptics.selectionAsync()),
  /** it worked — a month saved, a ledger created */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** stop and think — before a delete */
  warn: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** it failed */
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
