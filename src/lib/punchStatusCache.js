// Today's punch state, cached locally.
//
// /attendance/today is unreachable offline, and a punch made offline does not
// reach the server until later. Without a local record the punch screen would
// keep offering "Punch In" to someone who already punched in an hour ago, and
// they would queue a second one.
//
// The cache is scoped to a single calendar day so it can never leak yesterday's
// state into today.

const KEY = 'lpt_punch_status_cache';

const today = () => new Date().toDateString();

/** @returns {{punchedIn: boolean, punchedOut: boolean} | null} today's cached state */
export function readPunchStatus() {
  try {
    const cached = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!cached || cached.day !== today()) return null;
    return { punchedIn: !!cached.punchedIn, punchedOut: !!cached.punchedOut };
  } catch {
    return null;
  }
}

/** Overwrite the cache with authoritative server state. */
export function writePunchStatus({ punchedIn, punchedOut }) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ day: today(), punchedIn: !!punchedIn, punchedOut: !!punchedOut })
    );
  } catch {
    /* storage full or blocked – the screen still works, it just re-asks the server */
  }
}

/**
 * Record a punch the user just made, including one that is only queued so far.
 * Never clears a flag: a punch cannot be un-made locally.
 *
 * @param {'in'|'out'} type
 */
export function markPunchedLocally(type) {
  const current = readPunchStatus() || { punchedIn: false, punchedOut: false };
  const next = {
    punchedIn: current.punchedIn || type === 'in',
    punchedOut: current.punchedOut || type === 'out',
  };
  writePunchStatus(next);
  return next;
}
