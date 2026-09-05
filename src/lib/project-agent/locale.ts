export type ProjectAgentLocale = 'zh' | 'en'

export function normalizeProjectAgentLocale(value: unknown): ProjectAgentLocale {
  if (typeof value !== 'string') return 'zh'
  return value.trim().toLowerCase() === 'en' ? 'en' : 'zh'
}
