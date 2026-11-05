/** Small segmented control, one option active. */
export function Toggle<V extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: V; label: string }[]
  value: V
  onChange: (value: V) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-zinc-800 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={
            option.value === value
              ? 'rounded-md bg-sky-500/25 px-2.5 py-1 text-xs font-medium text-white'
              : 'rounded-md px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200'
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
