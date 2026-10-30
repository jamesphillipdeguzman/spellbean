/**
 * Safe, ad-blocker resilient visitor tracking using CounterAPI.
 * Silently catches and suppresses any network errors (e.g. ERR_BLOCKED_BY_CLIENT in Brave Shields / uBlock).
 */
export const trackVisit = async (signal?: AbortSignal): Promise<number | null> => {
  try {
    const response = await fetch('https://api.counterapi.dev/v1/spellbean/visits/up', {
      method: 'GET',
      mode: 'cors',
      signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.count === 'number' ? data.count : null;
  } catch (err) {
    // Silently fail if blocked by Brave Shields or ad blockers
    return null;
  }
};
