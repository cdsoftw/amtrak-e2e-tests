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
    await findTrains.submit();
  });

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
    await expect(findTrains.returnDateInput).toBeVisible();
  });

  test('a return date is only requested for a round trip', async ({
    findTrains,
  }) => {
    // initial state: One-Way, no return date field
    await expect(findTrains.returnDateInput).toHaveCount(0);

    // act
    await findTrains.selectTripType('Round-Trip');

    // assert
    await expect(findTrains.returnDateInput).toBeVisible();
    await expect(findTrains.departDateInput).toBeVisible();
  });

  test.fixme('a complete round trip enables FIND TRAINS', async () => {
    // makeSearch({ tripType: 'Round-Trip', returnDate: daysFromToday(21) })
  });

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

    // assert
    await expect(findTrains.stationOptions).toHaveCount(0);
    await expect(findTrains.findTrainsButton).toBeDisabled();
  });

  test('swapping exchanges origin and destination', async ({ findTrains }) => {
    // arrange
    const search = makeSearch();

    // act
    await findTrains.setOrigin(search.origin);
    await findTrains.setDestination(search.destination);
    await findTrains.swapStations();

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
      origin: STATIONS.WAS,
      destination: STATIONS.WAS,
    });

    // act
    await findTrains.fillSearch(search);

    // assert: both fields accept the station; the form rejects the combination
    await expect(findTrains.originInput).toHaveValue(STATIONS.WAS.code);
    await expect(findTrains.destinationInput).toHaveValue(STATIONS.WAS.code);
    await expect(findTrains.findTrainsButton).toBeDisabled();
  });

  test.fixme('rejects a return date earlier than the departure date', async () => {
    // round trip, depart +14d, return +7d
  });
});

test.describe('Find trains - dates', () => {
  test.fixme('a date can be chosen from the calendar picker', async () => {
    // Clicking either date control opens a modal calendar picker. As written,
    // the suite only enters dates via typing, so the widget most users would
    // actually use is unexercised. Worth covering month navigation, picking
    // a day, and past days being disabled (in both inputs).
  });
});

test.describe('Find trains - travelers', () => {
  test.fixme('adding a traveler updates the count and its plural', async () => {
    // click "+ Add adult", assert the button label goes from "1 Traveler" to
    // "2 Travelers"; subtract and assert it returns to "1".
  });

  test.fixme('travelers are capped at nine', async () => {
    // click "+ Add adult" until it disables; the expected cap is 9
  });

  test.fixme('mixed passenger types sum into the label', async () => {
    // one adult plus a senior plus a youth reads "3 Travelers"
  });

  test.fixme('Reset restores a single adult', async () => {
    // add several travelers of different types, click Reset, assert the label
    // is back to "1 Traveler"
  });
});
