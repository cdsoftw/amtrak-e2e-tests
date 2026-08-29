import {
  expect,
  test,
  errors,
  type Locator,
  type Page,
} from '@playwright/test';
import type { SearchCriteria, TripType } from '../data/search-criteria';
import type { Station } from '../data/stations';

/**
 * The "Find trains" search form on amtrak.com/home.
 *
 * Assertions in this class are strictly *synchronization* - waiting for an
 * autocomplete option to appear before clicking it, properly filling input
 * fields, etc. Assertions/verifications ("the button is enabled", "the error
 * is shown") belong to the spec. The locators are public for that reason:
 * specs assert against them directly, with no wrapper method hiding them.
 */
export class FindTrainsForm {
  private static readonly PATH = '/home';

  private readonly page: Page;

  // form controls
  readonly tripTypeButton: Locator;
  readonly originInput: Locator;
  readonly destinationInput: Locator;
  readonly departDateInput: Locator;
  readonly returnDateInput: Locator;
  readonly returnDateButton: Locator; // for One-Way trips - the return date is a button, not a text field
  readonly swapStationsButton: Locator;
  readonly travelersButton: Locator;
  readonly findTrainsButton: Locator; // submits the search

  /** Locator for all autocomplete suggestions in the active station field. */
  readonly stationOptions: Locator;

  /**
   * The autocomplete's empty state, rendered in place of the option list when
   * the typed text matches no station.
   */
  readonly noStationsFound: Locator;

  /**
   * Locator for the parent element of the Find Trains form.
   *
   * amtrak.com/home hosts multiple custom elements, several of which render
   * their own station/date inputs. Scoping to the fare finder ensures that
   * `FIND TRAINS` and `Depart Date` locators resolve to just one element.
   */
  private readonly root: Locator;

  constructor(page: Page) {
    this.page = page;

    // `testIdAttribute` is set to Amtrak's own `amt-auto-test-id` in the
    // config, so this uses `getByTestId` instead of a CSS attribute selector.
    this.root = page.getByTestId('fare-finder-cmp');

    // These inputs expose role=combobox only while empty. Once a suggestion
    // is accepted the role is dropped, so getByRole stops matching the field
    // and we can no longer assert against it; using Automation IDs instead.
    this.originInput = this.getStationInput('from');
    this.destinationInput = this.getStationInput('to');

    this.tripTypeButton = this.root.getByTestId('fare-finder-travel-selection');
    this.departDateInput = this.root.getByRole('textbox', {
      name: 'Depart Date',
    });

    this.returnDateInput = this.root.getByRole('textbox', {
      name: 'Return Date',
    });

    this.returnDateButton = this.root.getByRole('button', {
      name: 'Return Date',
    });

    this.swapStationsButton = this.root.getByLabel(
      'Switch departure and arrival stations'
    );

    this.travelersButton = this.root.getByTestId('traveler-dropdown-button');
    this.findTrainsButton = this.root.getByRole('button', {
      name: 'FIND TRAINS',
    });

    // The autocomplete list exists outside the fare finder's subtree, so keep
    // this one page-scoped.
    this.stationOptions = page.getByRole('option');

    // The message is a bare <span> carrying no role, so located by text - but
    // limited to elements with a listbox ancestor.
    this.noStationsFound = page
      .getByRole('listbox')
      .getByText('No stations found');
  }

  private getStationInput(which: 'from' | 'to'): Locator {
    return this.root
      .getByTestId(`fare-finder-${which}-station-field-page`)
      .locator('input');
  }

  /* ============================ page actions ============================= */

  async goto(): Promise<void> {
    await test.step('Open the Amtrak homepage and wait for the "Find Trains" form to be visible', async () => {
      await this.page.goto(FindTrainsForm.PATH, {
        waitUntil: 'domcontentloaded',
      });
      // The form is rendered by a client-side component, so DOM ready is not
      // enough - wait for the submit button and the input fields to exist
      // before performing any actions.
      await this.root.waitFor({ state: 'visible' });
      await this.originInput.waitFor({ state: 'visible' });
      await this.destinationInput.waitFor({ state: 'visible' });
      await this.departDateInput.waitFor({ state: 'visible' });
      await this.findTrainsButton.waitFor({ state: 'visible' });

      // The button, not returnDateInput: the form initially loads in One-Way,
      // where return date is a button and the text field does not exist yet.
      await this.returnDateButton.waitFor({ state: 'visible' });
    });
  }

  /**
   * The banner only appears on a fresh browser profile, so its absence is not
   * a failure. `waitFor` with a shorter timeout gives the button a chance to
   * appear before concluding it's absent.
   */
  async dismissCookieBannerIfPresent(): Promise<void> {
    const allowAll = this.page.getByRole('button', { name: 'Allow All' });
    const appeared = await allowAll
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch((error: unknown) => {
        // timeout is expected - anything else is a real fault and shouldn't be swallowed
        if (error instanceof errors.TimeoutError) return false;
        throw error;
      });

    if (!appeared) return;

    await test.step('Dismiss the cookie banner', async () => {
      await allowAll.click();
      await allowAll.waitFor({ state: 'hidden' });
    });
  }

  async selectTripType(tripType: TripType): Promise<void> {
    await test.step(`Select trip type "${tripType}"`, async () => {
      await this.tripTypeButton.click();
      await this.page
        .getByRole('button', { name: tripType, exact: true })
        .first()
        .click();

      // synchronization: need to be sure the click landed on the right element
      await expect(this.tripTypeButton).toContainText(tripType);
    });
  }

  async setOrigin(station: Station): Promise<void> {
    await test.step(`Set origin to ${station.code}`, async () => {
      await this.selectStation(this.originInput, station);
    });
  }

  async setDestination(station: Station): Promise<void> {
    await test.step(`Set destination to ${station.code}`, async () => {
      await this.selectStation(this.destinationInput, station);
    });
  }

  /**
   * Types free text into the origin field without selecting an option. Used to
   * exercise the autocomplete's own validation.
   */
  async typeInvalidOrigin(text: string): Promise<void> {
    await test.step(`Type "${text}" into the origin field`, async () => {
      await this.originInput.fill(text);
    });
  }

  async setDepartDate(date: Date): Promise<void> {
    await test.step(`Set depart date to ${formatDate(date)}`, async () => {
      await this.fillDate(this.departDateInput, date);
    });
  }

  /**
   * Types a departure date without asserting the form accepted it. Used to
   * exercise dates the form is expected to reject, where `setDepartDate`
   * would fail on its own commit assertion.
   */
  async typeInvalidDepartDate(date: Date): Promise<void> {
    await test.step(`Type depart date ${formatDate(date)}`, async () => {
      await this.enterDate(this.departDateInput, date);
    });
  }

  async setReturnDate(date: Date): Promise<void> {
    await test.step(`Set return date to ${formatDate(date)}`, async () => {
      await this.fillDate(this.returnDateInput, date);
    });
  }

  /** Fills the whole form from a built SearchCriteria. */
  async fillSearch(criteria: SearchCriteria): Promise<void> {
    if (criteria.tripType !== 'One-Way') {
      await this.selectTripType(criteria.tripType);
    }
    await this.setOrigin(criteria.origin);
    await this.setDestination(criteria.destination);
    await this.setDepartDate(criteria.departDate);
    if (criteria.returnDate) {
      await this.setReturnDate(criteria.returnDate);
    }
  }

  /* ========================== helper functions =========================== */

  /**
   * A station has to be chosen from the suggestion list. Typing a bare station
   * code sets the visible text but never commits the station to the form
   * model, so FIND TRAINS stays disabled.
   */
  private async selectStation(input: Locator, station: Station): Promise<void> {
    await input.fill(station.query);
    await this.stationOptions.first().click();

    // synchronization: the field holds the station code once the selection is
    // committed to the form, which happens after the keypress
    await expect(input).toHaveValue(station.code);
  }

  /**
   * Enters a date and waits for the text to land in the field.
   *
   * Synchronization only - it cannot prove the component parsed the date.
   * MM/DD/YYYY and M/D/YYYY are the same string on days where month and day
   * are both two digits, so on those dates the expected value below is exactly
   * the string that was just typed.
   *
   * Acceptance is observable on FIND TRAINS, which needs a complete form - so
   * the specs assert on that, not this method.
   */
  private async fillDate(input: Locator, date: Date): Promise<void> {
    await this.enterDate(input, date);

    // date is echoed back without the leading zero (01/31 becomes 1/31)
    await expect(input).toHaveValue(normalizeDate(date));
  }

  /**
   * Internal helper - types a date without requiring the form to accept it.
   *
   * Uses `click({ force: true })` because a floating <label> sits over these
   * inputs and intercepts pointer events. `force` skips *every* actionability
   * check, and should normally be avoided - in this case, mitigated by a value
   * assertion guard (where needed). If the click doesn't land properly, the
   * date never parses, failing the assertion.
   *
   * Also types with separate keystrokes. Normally an antipattern, as `fill()`
   * is preferred; on this page, the date inputs don't handle it properly. When
   * `fill()` is used, the date appears in the box, but the form never parses
   * it, causing a silent failure: the field looks correct, but the submit
   * button remains disabled.
   */
  private async enterDate(input: Locator, date: Date): Promise<void> {
    await input.clear();
    await input.click({ force: true });
    await input.pressSequentially(formatDate(date), { delay: 40 });
    await this.page.keyboard.press('Escape'); // closes the calendar widget
    await input.blur(); // simulates the user clicking away, which triggers the form to parse the date
  }
}

/**
 * Convert a `Date` instance to the string format enforced by the form (MM/DD/YYYY).
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

/** How the field echoes a date back once it has parsed it: M/D/YYYY. */
function normalizeDate(date: Date): string {
  return date.toLocaleDateString('en-US');
}
