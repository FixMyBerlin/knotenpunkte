import { describe, expect, it } from 'vitest'
import { parseSuggestionsText, suggestionProbability } from './schema'

describe('parseSuggestionsText', () => {
  it('accepts binary and ternary values on matching attributes', () => {
    const rows = parseSuggestionsText(
      JSON.stringify([
        { id: '1', attribute: 'KP_HVS', value: 1, confidence: 0.99 },
        { id: '1', attribute: 'Furt_rot', value: 'gänzlich', confidence: 0.7 },
      ]),
    )
    expect(rows).toHaveLength(2)
  })

  it('rejects a value that does not fit the attribute', () => {
    expect(() =>
      parseSuggestionsText(
        JSON.stringify([{ id: '1', attribute: 'KP_HVS', value: 'keine', confidence: 0.5 }]),
      ),
    ).toThrow(/KP_HVS/)
    expect(() =>
      parseSuggestionsText(
        JSON.stringify([{ id: '1', attribute: 'Furt_rot', value: 0, confidence: 0.5 }]),
      ),
    ).toThrow(/Furt_rot/)
  })

  it('rejects duplicate rows per node and attribute', () => {
    const row = { id: '1', attribute: 'Furt_rot', value: 'keine', confidence: 0.5 }
    expect(() => parseSuggestionsText(JSON.stringify([row, row]))).toThrow(/Doppelter/)
  })

  it('reads per-value probabilities and falls back to the single confidence', () => {
    const [full, single] = parseSuggestionsText(
      JSON.stringify([
        {
          id: '1',
          attribute: 'Furt_rot',
          value: 'teilweise',
          confidence: 0.7,
          probabilities: { keine: 0.1, teilweise: 0.7, gänzlich: 0.2 },
        },
        { id: '1', attribute: 'KP_HVS', value: 1, confidence: 0.9 },
      ]),
    )
    expect(suggestionProbability(full!, 'keine')).toBe(0.1)
    expect(suggestionProbability(full!, 'gänzlich')).toBe(0.2)
    expect(suggestionProbability(single!, 1)).toBe(0.9)
    expect(suggestionProbability(single!, 0)).toBeUndefined()
  })

  it('rejects probabilities for values that do not fit the attribute', () => {
    expect(() =>
      parseSuggestionsText(
        JSON.stringify([
          {
            id: '1',
            attribute: 'KP_HVS',
            value: 1,
            confidence: 0.9,
            probabilities: { keine: 0.1 },
          },
        ]),
      ),
    ).toThrow(/KP_HVS/)
  })
})
