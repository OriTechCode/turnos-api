import { DateTime } from "luxon";

export function localToUtcIso(localIso: string, timeZone: string): string {
  const dt = DateTime.fromISO(localIso, { zone: timeZone });
  if (!dt.isValid) throw new Error(`Invalid datetime: ${localIso}`);
  return dt.toUTC().toISO();
}
