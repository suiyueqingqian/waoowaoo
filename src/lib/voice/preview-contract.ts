const MIN_CJK_PREVIEW_CHARACTERS = 14
const MIN_WORD_BASED_PREVIEW_WORDS = 7
const CJK_LANGUAGES = new Set<string>(['Chinese', 'Japanese', 'Korean'])
const CJK_CHARACTER_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const SIGNIFICANT_CHARACTER_PATTERN = /[\p{L}\p{N}]/u
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu

export function voicePreviewTargetIssue(input: {
  readonly previewText: string
  readonly language: string
}): string | null {
  const text = input.previewText.trim()
  const usesCjkTarget = CJK_LANGUAGES.has(input.language) || CJK_CHARACTER_PATTERN.test(text)
  if (usesCjkTarget) {
    const characters = Array.from(text).filter((character) => SIGNIFICANT_CHARACTER_PATTERN.test(character)).length
    return characters >= MIN_CJK_PREVIEW_CHARACTERS
      ? null
      : `previewText must contain at least ${String(MIN_CJK_PREVIEW_CHARACTERS)} meaningful CJK characters for a useful voice reference sample.`
  }
  const words = text.match(WORD_PATTERN)?.length ?? 0
  return words >= MIN_WORD_BASED_PREVIEW_WORDS
    ? null
    : `previewText must contain at least ${String(MIN_WORD_BASED_PREVIEW_WORDS)} words for a useful voice reference sample.`
}
