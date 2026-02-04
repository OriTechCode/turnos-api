import { DateTime } from "luxon";

export type Interval = { startUtc: Date; endUtc: Date };

export function overlaps(a: Interval, b: Interval) {
  return a.startUtc < b.endUtc && b.startUtc < a.endUtc;
}

export function providerDayBoundsUtc(dateYYYYMMDD: string, providerTz: string) {
  // dateYYYYMMDD se interpreta como fecha en tz del provider
  const dayStart = DateTime.fromISO(dateYYYYMMDD, { zone: providerTz }).startOf("day");
  const dayEnd = dayStart.plus({ days: 1 });

  if (!dayStart.isValid) throw new Error(`Invalid date: ${dateYYYYMMDD}`);

  return {
    dayStartUtc: dayStart.toUTC().toJSDate(),
    dayEndUtc: dayEnd.toUTC().toJSDate(),
    dayStartLocal: dayStart, // DateTime en tz provider
  };
}

export function toClientIso(dtUtc: Date, clientTz: string): string {
  const iso = DateTime.fromJSDate(dtUtc, { zone: "utc" })
    .setZone(clientTz)
    .toISO();

  if (!iso) throw new Error("Invalid datetime when formatting to ISO");
  return iso;
}
