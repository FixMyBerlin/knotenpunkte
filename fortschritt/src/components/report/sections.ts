/** Parts and sections of the report, in page order. The ids are the element ids on the page. */
export const reportSections = [
  {
    id: 'ueberblick',
    title: 'Überblick',
    children: [
      { id: 'stand', title: 'Laufende Lieferung' },
      { id: 'burnup', title: 'Burn-up' },
      { id: 'bezirke', title: 'Bezirke' },
    ],
  },
  {
    id: 'personen',
    title: 'Personen',
    children: [
      { id: 'tempo', title: 'Tempo je Account' },
      { id: 'wochen', title: 'km je Woche' },
    ],
  },
] as const

export type ReportSectionId =
  | (typeof reportSections)[number]['id']
  | (typeof reportSections)[number]['children'][number]['id']

export const reportSectionIds: ReportSectionId[] = reportSections.flatMap((part) => [
  part.id,
  ...part.children.map((child) => child.id),
])
