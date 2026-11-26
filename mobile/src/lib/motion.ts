// The app's motion vocabulary — one set of springs, so every movement
// feels like the same hand. Every preset honours the iPhone's Reduce Motion
// setting (ReduceMotion.System): with it on, things simply appear.

import {
  FadeIn, FadeInDown, FadeInUp, FadeOut, LinearTransition, ReduceMotion,
  type WithSpringConfig,
} from 'react-native-reanimated';

/** the press spring: quick, slightly soft, no wobble */
export const PRESS: WithSpringConfig = { damping: 16, stiffness: 320, mass: 0.6 };

/** a card arriving: rises a few points and settles, staggered by position */
export const enter = (i = 0) =>
  FadeInDown.delay(Math.min(i, 8) * 55).springify().damping(18).stiffness(170).reduceMotion(ReduceMotion.System);

/** a chat bubble arriving from below */
export const bubble = (i = 0) =>
  FadeInUp.delay(i * 90).springify().damping(17).stiffness(190).reduceMotion(ReduceMotion.System);

export const fadeIn = FadeIn.duration(220).reduceMotion(ReduceMotion.System);
export const fadeOut = FadeOut.duration(140).reduceMotion(ReduceMotion.System);

/** siblings making room when something opens or folds */
export const layout = LinearTransition.springify().damping(20).stiffness(190).reduceMotion(ReduceMotion.System);
