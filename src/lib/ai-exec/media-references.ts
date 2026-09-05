type MediaRequestIdentityInput = {
  readonly modality?: unknown
  readonly imageUrl?: unknown
  readonly options?: unknown
  readonly [key: string]: unknown
}

function stableMediaReference(value: unknown, field: string): unknown {
  if (typeof value !== 'string' || !value) return value
  const normalized = value.trim()
  if (!normalized) return value
  try {
    new URL(normalized)
  } catch {
    if (/^[a-z][a-z\d+.-]*:/i.test(normalized) || normalized.includes('\\')) {
      throw new Error(`PROVIDER_MEDIA_REFERENCE_INVALID:${field}`)
    }
    return normalized.replace(/^\/+/, '')
  }
  throw new Error(`PROVIDER_MEDIA_REFERENCE_CANONICAL_IDENTITY_REQUIRED:${field}`)
}

function stableMediaReferenceArray(value: unknown, field: string): unknown {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    throw new Error(`PROVIDER_MEDIA_REFERENCE_INVALID:${field}`)
  }
  return value.map((item, index) => stableMediaReference(item, `${field}[${String(index)}]`))
}

/**
 * Builds the durable identity input for a media provider request. Canonical
 * storage keys remain identity-bearing while signed query credentials and
 * inline serialization are transport details. The original request object is
 * never mutated and remains the source for final provider projection.
 */
export function createMediaProviderRequestIdentity<T extends MediaRequestIdentityInput>(
  input: T,
): T {
  const rawOptions = input.options
  const options = rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)
    ? { ...(rawOptions as Record<string, unknown>) }
    : rawOptions
  const result: Record<string, unknown> = { ...input }
  if (input.modality === 'video' && input.imageUrl) {
    result.imageUrl = stableMediaReference(input.imageUrl, 'imageUrl')
  }
  if (options && typeof options === 'object' && !Array.isArray(options)) {
    if ('referenceImages' in options) {
      options.referenceImages = stableMediaReferenceArray(options.referenceImages, 'referenceImages')
    }
    if ('referenceAudios' in options) {
      options.referenceAudios = stableMediaReferenceArray(options.referenceAudios, 'referenceAudios')
    }
    if ('referenceVideos' in options) {
      options.referenceVideos = stableMediaReferenceArray(options.referenceVideos, 'referenceVideos')
    }
    if ('lastFrameImageUrl' in options && options.lastFrameImageUrl !== undefined) {
      options.lastFrameImageUrl = stableMediaReference(options.lastFrameImageUrl, 'lastFrameImageUrl')
    }
    result.options = options
  }
  return result as T
}
