import { test, expect } from '../fixtures/test';
import { makeSearch, daysFromToday } from '../data/search-criteria';
import { STATIONS, type Station } from '../data/stations';

/** Station data is interpolated into a RegExp, so metacharacters must escape. */
const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Matches both the code and the full name in a station field. */
const identifies = (station: Station) =>
  new RegExp(
    `^(${escapeRegExp(station.code)}|${escapeRegExp(station.query)})`,
    'i'
  );

/**
 * Scope: the "Find trains" search form on amtrak.com/home, up to and including
 * the FIND TRAINS button click. The search results page and all other post-click
 * behavior is out of scope.
 */

test.describe('Find trains - initial state', () => {
  test('the form loads as an empty One-Way trip that cannot submit', async ({
    findTrains,
  }) => {
    // assert state, not existence - the latter is already covered by `goto()`
    await expect(findTrains.originInput).toBeEditable();
    await expect(findTrains.originInput).toHaveValue('');
    await expect(findTrains.destinationInput).toBeEditable();
    await expect(findTrains.destinationInput).toHaveValue('');
    await expect(findTrains.departDateInput).toBeEditable();
    await expect(findTrains.departDateInput).toHaveValue('');

    await expect(findTrains.tripTypeButton).toContainText('One-Way');
    await expect(findTrains.travelersButton).toHaveText(/^\s*1\s*Traveler\s*$/);
    await expect(findTrains.findTrainsButton).toBeDisabled();
  });
});

test.describe('Find trains - submission gate', () => {
  test('FIND TRAINS is disabled until origin, destination and depart date are set', async ({
    findTrains,
  }) => {
    // arrange
    const search = makeSearch();
    await expect(findTrains.findTrainsButton).toBeDisabled(); // initial state

    // act + assert: button only enabled once all three are set
    await findTrains.setOrigin(search.origin);
    await expect(findTrains.findTrainsButton).toBeDisabled();
    await findTrains.setDestination(search.destination);
    await expect(findTrains.findTrainsButton).toBeDisabled();
    await findTrains.setDepartDate(search.departDate);
    await expect(findTrains.findTrainsButton).toBeEnabled(); // form completely filled

    // edge of the scope - asserting anything after would test the results page
    await findTrains.findTrainsButton.click();
  });

  // eslint-disable-next-line playwright/expect-expect -- planned coverage, not yet written
  test.fixme('clearing a chosen station disables FIND TRAINS again', async () => {
    // complete a valid search so the button enables, then empty the origin
    // field - the button should become disabled once more
  });
});

test.describe('Find trains - trip type', () => {
  test('choosing a return date switches to Round-Trip', async ({
    findTrains,
  }) => {
    // initial state: One-Way, no return date field
    await expect(findTrains.tripTypeButton).toContainText('One-Way');
    await expect(findTrains.returnDateInput).toHaveCount(0);

    // act
    await findTrains.returnDateButton.click();

    // assert
    await expect(findTrains.tripTypeButton).toContainText('Round-Trip');
    await expect(findTrains.returnDateInput).toBeEditable();
  });

  test('a return date is only requested for a round trip', async ({
    findTrains,
  }) => {
    // initial state: One-Way, no return date field
    await expect(findTrains.tripTypeButton).toContainText('One-Way');
    await expect(findTrains.returnDateInput).toHaveCount(0);

    // act
    await findTrains.selectTripType('Round-Trip');

    // assert
    await expect(findTrains.returnDateInput).toBeEditable();
    await expect(findTrains.departDateInput).toBeEditable();
  });

  test('a complete round trip enables FIND TRAINS', async ({ findTrains }) => {
    // arrange
    const search = makeSearch({
      tripType: 'Round-Trip',
      returnDate: daysFromToday(21),
    });

    // act
    await findTrains.fillSearch(search);

    // assert: the trip type check proves the form did not silently fall back
    // to One-Way and enable on three fields instead of four
    await expect(findTrains.findTrainsButton).toBeEnabled();
    await expect(findTrains.tripTypeButton).toContainText('Round-Trip');
  });

  // eslint-disable-next-line playwright/expect-expect -- planned coverage, not yet written
  test.fixme('supports Multi-City trips', async () => {
    // The trip-type tabs include Multi-City alongside One-Way and Round-Trip.
    // Selecting it, or clicking "Add Trip", adds another origin/destination/
    // date row. That is a different shape, so SearchCriteria would need to
    // model multiple rows before this is testable.
  });
});

test.describe('Find trains - station input', () => {
  test('no autocomplete options shown for text without station matches', async ({
    findTrains,
  }) => {
    // act
    await findTrains.typeInvalidOrigin('zzzznotastation');

    // assert: waiting on empty state proves autocomplete ran and found nothing
    await expect(findTrains.noStationsFound).toBeVisible();
    await expect(findTrains.stationOptions).toHaveCount(0);
    await expect(findTrains.findTrainsButton).toBeDisabled();
  });

  test('swapping exchanges origin and destination', async ({ findTrains }) => {
    // arrange
    const search = makeSearch();

    // act
    await findTrains.setOrigin(search.origin);
    await findTrains.setDestination(search.destination);
    await findTrains.swapStationsButton.click();

    // assert: a station field displays its code once a suggestion is accepted,
    // but the swap re-renders both inputs and puts the station name back - so
    // the assertions accept either spelling of the same station.
    await expect(findTrains.originInput).toHaveValue(
      identifies(search.destination)
    );
    await expect(findTrains.destinationInput).toHaveValue(
      identifies(search.origin)
    );
  });
});

test.describe('Find trains - rejected input', () => {
  test('rejects a departure date in the past', async ({ findTrains }) => {
    // arrange
    const search = makeSearch();
    await findTrains.setOrigin(search.origin);
    await findTrains.setDestination(search.destination);

    // act
    await findTrains.typeInvalidDepartDate(daysFromToday(-1));

    // assert: the form rejects it silently + the field clears
    await expect(findTrains.departDateInput).toHaveValue('');
    await expect(findTrains.findTrainsButton).toBeDisabled();
  });

  test('rejects the same station for both origin and destination', async ({
    findTrains,
  }) => {
    // arrange
    const search = makeSearch({
      origin: STATIONS.PHL,
      destination: STATIONS.PHL,
    });

    // act
    await findTrains.fillSearch(search);

    // assert: both fields accept the station; the form rejects the combination
    await expect(findTrains.originInput).toHaveValue(STATIONS.PHL.code);
    await expect(findTrains.destinationInput).toHaveValue(STATIONS.PHL.code);
    await expect(findTrains.findTrainsButton).toBeDisabled();
  });

  // eslint-disable-next-line playwright/expect-expect -- planned coverage, not yet written
  test.fixme('rejects a return date earlier than the departure date', async () => {
    // round trip, depart +14d, return +7d
  });
});

test.describe('Find trains - dates', () => {
  // eslint-disable-next-line playwright/expect-expect -- planned coverage, not yet written
  test.fixme('a date can be chosen from the calendar picker', async () => {
    // Clicking either date control opens a modal calendar picker. As written,
    // the suite only enters dates via typing, so the widget most users would
    // actually use is unexercised. Worth covering month navigation, picking
    // a day, and past days being disabled (in both inputs).
  });
});

test.describe('Find trains - travelers', () => {
  // eslint-disable-next-line playwright/expect-expect -- planned coverage, not yet written
  test.fixme('the travelers panel updates the count', async () => {
    // The largest untested part of the form: five passenger types (adult,
    // senior, youth, child, infant), each with increment and decrement
    // controls, plus a Reset button and a hard cap of nine travelers. Worth
    // covering the label's plural ("1 Traveler" -> "2 Travelers"), mixed types
    // summing into one total, the cap disabling the add button, and Reset
    // restoring a single adult. Cheap to add - every control has an automation
    // id and a clear accessible name; no dependency on autocomplete.
  });
});
