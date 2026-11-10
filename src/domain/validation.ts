export function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${label} must be an object.`)
  return value as Record<string, unknown>
}

export function text(value: unknown, label: string, max: number, empty = false): string {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (!empty && !value.trim()) ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)
  )
    throw new Error(`${label} must be ${empty ? 'at most' : '1–'}${max} characters.`)
  return value
}

export function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max)
    throw new Error(`${label} must be an integer from ${min} to ${max}.`)
  return value
}

export function choice<const T extends readonly string[]>(
  value: unknown,
  label: string,
  values: T,
): T[number] {
  if (typeof value !== 'string' || !values.includes(value))
    throw new Error(`${label} has an unsupported value.`)
  return value as T[number]
}

export function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean.`)
  return value
}

export function list(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error(`${label} must be an array with at most ${max} entries.`)
  return value
}

export function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`${label} must be unique.`)
}

export function jsonText(source: string): unknown {
  if (source.length > 120000) throw new Error('Workspace JSON exceeds 120,000 characters.')
  return JSON.parse(source) as unknown
}
