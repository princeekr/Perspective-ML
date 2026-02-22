import { useTracker } from '@/hooks/useTracker';

/**
 * Silent behavior tracking component
 * Tracks: page visits, clicks, mouse movements, scroll depth
 * Runs in background without affecting UI
 */
const BehaviorTracker = () => {
  useTracker();
  return null;
};

export default BehaviorTracker;
