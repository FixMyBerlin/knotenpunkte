/**
 * Delivery plan of the REN+ mapping. Dates are calendar days in Europe/Berlin; a deadline means
 * "done at the start of this day". The order of `bezirke` is the order of the tables.
 * Accounts are not listed here: they come from the `account` field of the edges.
 */
export type Delivery = {
  nr: number
  /** Mapping must be done by this day. */
  deadlineMapping: string
  /** Hand-over to the client, shown for information only. */
  abgabe: string
  bezirke: readonly string[]
}

export const deliveries: readonly Delivery[] = [
  {
    nr: 2,
    deadlineMapping: '2027-03-01',
    abgabe: '2027-04-01',
    bezirke: [
      'Neukölln',
      'Treptow-Köpenick',
      'Tempelhof-Schöneberg',
      'Steglitz-Zehlendorf',
      'Spandau',
      'Charlottenburg-Wilmersdorf',
    ],
  },
  {
    nr: 3,
    deadlineMapping: '2027-08-01',
    abgabe: '2027-09-01',
    bezirke: [
      'Friedrichshain-Kreuzberg',
      'Marzahn-Hellersdorf',
      'Lichtenberg',
      'Pankow',
      'Mitte',
      'Reinickendorf',
    ],
  },
]

/**
 * The project starts on the Monday of the week of the first completion. Until there is one,
 * this Monday is used.
 */
export const fallbackStart = '2026-10-26'

/** Pace compared with what is needed: at least `green` is on track, below `yellow` too slow. */
export const ampelThresholds = { green: 1, yellow: 0.8 } as const

/** Within this many km of the Soll line counts as "im Plan". */
export const onPlanToleranceKm = 0.5

/**
 * Anlernphase of a mapper, for Personen only: in the first `days` days after their first mark,
 * `factor` of the needed pace already counts as "im Plan". The burn-up does not use it.
 */
export const rampUp = { days: 14, factor: 0.6 } as const

/**
 * Working time in Berlin: Monday to Friday, `startHour` to `endHour`. Pace, needed km/week and
 * the forecast count only these hours, so nights and weekends move nothing. A work week is
 * 5 work days. No public holidays.
 */
export const workTime = { startHour: 9, endHour: 16 } as const

/** A pace is taken over at least this many work days, so one good first day is not a week. */
export const minPaceWorkDays = 5

/** Rolling windows of the averages, in days. */
export const paceWindowDays = { forecast: 28, account: 14 } as const
