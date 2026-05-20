import { createContext, useContext } from 'react';

// Default: trial active, no restrictions
export const TrialContext = createContext({
  trialActive:   true,
  daysRemaining: 30,
  isReadOnly:    false,
  isPaid:        false,
  trialEndDate:  null,
  loading:       true,
});

export const useTrial = () => useContext(TrialContext);
