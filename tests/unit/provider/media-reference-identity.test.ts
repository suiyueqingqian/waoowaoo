import { describe, expect, it } from 'vitest'
import { createMediaProviderRequestIdentity } from '@/lib/ai-exec/media-references'

function videoRequest() {
  return {
    modality: 'video',
    prompt: 'same prompt',
    imageUrl: 'images/first.png',
    options: {
      durationSeconds: 5,
      referenceImages: ['images/reference.png'],
      referenceAudios: ['audio/voice.wav'],
      referenceVideos: ['videos/motion.mp4'],
      lastFrameImageUrl: 'images/last.png',
    },
  } as const
}

describe('media provider durable request identity', () => {
  it('preserves canonical storage identities without changing the source request', () => {
    const request = videoRequest()
    const snapshot = structuredClone(request)

    expect(createMediaProviderRequestIdentity(request)).toEqual(request)
    expect(request).toEqual(snapshot)
  })

  it('keeps object paths, reference order, and real options identity-bearing', () => {
    const base = videoRequest()
    const differentObject = {
      ...videoRequest(),
      imageUrl: 'images/other.png',
    }
    const differentOption = {
      ...videoRequest(),
      options: { ...videoRequest().options, durationSeconds: 10 },
    }
    const reversedReferences = {
      ...base,
      options: {
        ...base.options,
        referenceImages: [
          'images/second.png',
          'images/reference.png',
        ],
      },
    }
    const oppositeOrder = {
      ...reversedReferences,
      options: {
        ...reversedReferences.options,
        referenceImages: [...reversedReferences.options.referenceImages].reverse(),
      },
    }

    expect(createMediaProviderRequestIdentity(base)).not.toEqual(
      createMediaProviderRequestIdentity(differentObject),
    )
    expect(createMediaProviderRequestIdentity(base)).not.toEqual(
      createMediaProviderRequestIdentity(differentOption),
    )
    expect(createMediaProviderRequestIdentity(reversedReferences)).not.toEqual(
      createMediaProviderRequestIdentity(oppositeOrder),
    )
  })

  it('rejects temporary URL and inline wire representations as durable identity', () => {
    expect(() => createMediaProviderRequestIdentity({
      ...videoRequest(),
      imageUrl: 'https://media.example.com/first.png?X-Amz-Signature=temporary',
    })).toThrow('PROVIDER_MEDIA_REFERENCE_CANONICAL_IDENTITY_REQUIRED:imageUrl')
    expect(() => createMediaProviderRequestIdentity({
      ...videoRequest(),
      imageUrl: 'data:image/png;base64,AAAA',
    })).toThrow('PROVIDER_MEDIA_REFERENCE_CANONICAL_IDENTITY_REQUIRED:imageUrl')
  })
})
