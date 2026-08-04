/**
 * Pure free-tier gating logic, separated from I/O so it can be unit tested.
 */

export function shouldResetUsage(lastReset: Date, now: Date, resetDays: number): boolean {
  const ms = resetDays * 24 * 60 * 60 * 1000;
  return now.getTime() - lastReset.getTime() >= ms;
}

export function canSendMessage(
  messagesUsed: number,
  subscriptionStatus: 'free' | 'active',
  freeLimit: number,
): boolean {
  if (subscriptionStatus === 'active') return true;
  return messagesUsed < freeLimit;
}
