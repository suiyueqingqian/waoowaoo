export interface GenerationReferenceDurationLimits {
  readonly minimumMs: number | null
  readonly maximumMs: number | null
  readonly minimumTotalMs: number | null
  readonly maximumTotalMs: number | null
}

export function projectReferenceDurationLimits(capabilities: {
  readonly minReferenceAudioDurationMs?: number | null
  readonly maxReferenceAudioDurationMs?: number | null
  readonly maxTotalReferenceAudioDurationMs?: number | null
  readonly minReferenceVideoDurationMs?: number | null
  readonly maxReferenceVideoDurationMs?: number | null
  readonly minTotalReferenceVideoDurationMs?: number | null
  readonly maxTotalReferenceVideoDurationMs?: number | null
}) {
  return {
    audio: {
      minimumMs: capabilities.minReferenceAudioDurationMs ?? null,
      maximumMs: capabilities.maxReferenceAudioDurationMs ?? null,
      minimumTotalMs: null,
      maximumTotalMs: capabilities.maxTotalReferenceAudioDurationMs ?? null,
    },
    video: {
      minimumMs: capabilities.minReferenceVideoDurationMs ?? null,
      maximumMs: capabilities.maxReferenceVideoDurationMs ?? null,
      minimumTotalMs: capabilities.minTotalReferenceVideoDurationMs ?? null,
      maximumTotalMs: capabilities.maxTotalReferenceVideoDurationMs ?? null,
    },
  }
}

/** Duration facts come from the immutable media version, never the filename. */
export function validateGenerationReferenceDurations(
  channel: 'audio' | 'video',
  limits: GenerationReferenceDurationLimits,
  references: readonly { readonly durationMs?: number | null }[],
): { readonly code: string; readonly field: 'references'; readonly minimumDurationMs: number | null; readonly maximumDurationMs: number | null; readonly minimumTotalDurationMs: number | null; readonly maximumTotalDurationMs: number | null } | null {
  if (references.length === 0 || Object.values(limits).every((limit) => limit === null)) return null
  const failure = (suffix: string) => ({
    code: `VIDEO_MODEL_REFERENCE_${channel.toUpperCase()}_${suffix}`, field: 'references' as const,
    minimumDurationMs: limits.minimumMs, maximumDurationMs: limits.maximumMs,
    minimumTotalDurationMs: limits.minimumTotalMs, maximumTotalDurationMs: limits.maximumTotalMs,
  })
  let totalMs = 0
  for (const reference of references) {
    const duration = reference.durationMs
    if (duration == null || !Number.isFinite(duration) || duration <= 0) return failure('DURATION_UNKNOWN')
    if (limits.minimumMs !== null && duration < limits.minimumMs) return failure('TOO_SHORT')
    if (limits.maximumMs !== null && duration > limits.maximumMs) return failure('TOO_LONG')
    totalMs += duration
  }
  if (limits.minimumTotalMs !== null && totalMs < limits.minimumTotalMs) return failure('TOTAL_DURATION_TOO_SHORT')
  if (limits.maximumTotalMs !== null && totalMs > limits.maximumTotalMs) return failure('TOTAL_DURATION_EXCEEDED')
  return null
}
