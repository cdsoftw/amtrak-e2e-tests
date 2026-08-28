/**
 * Stations used by the test suite.
 *
 * Both fields are used. `query` is what gets typed, since the autocomplete
 * only offers suggestions for a city or station name - not a bare code. `code`
 * is what the field holds once a suggestion is chosen, so it's also what the
 * assertions check against.
 */
export interface Station {
  readonly code: string;
  readonly query: string;
}

export const STATIONS = {
  NYP: { code: 'NYP', query: 'New York' },
  WAS: { code: 'WAS', query: 'Washington' },
  PHL: { code: 'PHL', query: 'Philadelphia' },
} as const satisfies Record<string, Station>;
