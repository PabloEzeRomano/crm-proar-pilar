import dayjs from 'dayjs';
import 'dayjs/locale/es';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isToday from 'dayjs/plugin/isToday';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isToday);
dayjs.extend(duration);

dayjs.locale('es');

// Compute the local UTC offset in minutes using Intl (not Date.getTimezoneOffset,
// which is broken on some Hermes builds). Cached after first call.
let _cachedOffsetMinutes: number | null = null;
function getLocalOffsetMinutes(): number {
  if (_cachedOffsetMinutes !== null) return _cachedOffsetMinutes;
  try {
    const probe = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // sv-SE locale formats as "YYYY-MM-DD HH:mm:ss" — parseable as local ISO
    const localStr = probe.toLocaleString('sv-SE', { timeZone: tz });
    const utcStr = probe.toLocaleString('sv-SE', { timeZone: 'UTC' });
    _cachedOffsetMinutes =
      (new Date(localStr).getTime() - new Date(utcStr).getTime()) / 60000;
  } catch {
    _cachedOffsetMinutes = 0;
  }
  return _cachedOffsetMinutes;
}

// fromUTC: parse a UTC ISO string into device local time.
// Avoids Date.getTimezoneOffset() (broken on some Hermes builds).
export function fromUTC(isoString: string) {
  return dayjs.utc(isoString).utcOffset(getLocalOffsetMinutes());
}

export { dayjs as default };
