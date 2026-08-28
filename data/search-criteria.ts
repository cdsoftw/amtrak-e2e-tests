import { STATIONS, type Station } from './stations';

// future improvement: support Multi-City trip type
// ('Add Trip' button + TripType option; adds new form rows)
export type TripType = 'One-Way' | 'Round-Trip';

export interface SearchCriteria {
  readonly tripType: TripType;
  readonly origin: Station;
  readonly destination: Station;
  readonly departDate: Date;
  readonly returnDate?: Date; // only meaningful when tripType is Round-Trip
}

export function daysFromToday(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * A valid one-way search, with any field overridable. Uses relative dates, as
 * the suite would rot the moment a hard-coded date falls into the past.
 */
export function aSearch(
  overrides: Partial<SearchCriteria> = {}
): SearchCriteria {
  return {
    tripType: 'One-Way',
    origin: STATIONS.NYP,
    destination: STATIONS.WAS,
    departDate: daysFromToday(14),
    ...overrides,
  };
}
