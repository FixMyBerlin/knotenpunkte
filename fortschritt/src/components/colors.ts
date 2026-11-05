/**
 * Chart and map colours for the dark app (reference palette of the dataviz skill, dark steps).
 * Accounts take the categorical slots in their sorted order, so a colour follows the account.
 */
const categorical = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
] as const

export function accountColor(accounts: string[], account: string) {
  const index = accounts.indexOf(account)
  return index === -1 ? '#898781' : (categorical[index % categorical.length] ?? '#898781')
}

export const chartColors = {
  ist: '#3987e5',
  soll: '#c3c2b7',
  muted: '#898781',
  grid: '#2c2c2a',
  baseline: '#383835',
  ink: '#f0efec',
  inkSecondary: '#c3c2b7',
} as const

/**
 * Edges on the map, always with the legend text. Blue and vermillion of the Okabe-Ito palette
 * instead of the editor's green and red, so people with red-green colour blindness can tell
 * done from open.
 */
export const edgeColors = { done: '#0072b2', open: '#d55e00' } as const

/** Outline of the Gebiete while the edges show done/open: dark, so it stands out on the light basemap. */
export const gebietOutline = '#27272a'
