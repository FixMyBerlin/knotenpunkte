/** Answer the first, second and third choice of the active attribute. */
export const choiceHotkeys = ['Q', 'W', 'E'] as const

/** Not relevant: saved as a node that needs no rating. */
export const skipHotkey = 'X' as const
/** Not considered: saved as finished with HVS and LSA as they are. */
export const excludeHotkey = 'C' as const
/** Put off for later, with an internal note. */
export const deferHotkey = 'Z' as const
export const previousHotkey = 'J' as const
export const nextHotkey = 'K' as const

/** Jump into the fields below the attributes; Tab moves on from there, Escape leaves them. */
export const customerNoteHotkey = 'H' as const
export const internalNoteHotkey = 'I' as const
export const sourceHotkey = 'O' as const
