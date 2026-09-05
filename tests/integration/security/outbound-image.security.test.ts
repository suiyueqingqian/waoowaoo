import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OutboundImageNormalizeError,
  normalizeToBase64ForGeneration,
  normalizeToOriginalMediaUrl,
} from '@/lib/media/outbound-image'
import { lookup } from 'node:dns/promises'

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}))

describe('outbound-image normalization', () => {
  const fetchMock = vi.fn<typeof fetch>()
  const dnsLookupMock = vi.mocked(lookup)

  beforeEach(() => {
    fetchMock.mockReset()
    dnsLookupMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    // Use the real storage URL adapter with isolated configuration; these cases
    // exercise external media and never read or write an S3 object.
    vi.stubEnv('S3_ENDPOINT', 'https://storage.example.com')
    vi.stubEnv('S3_UPLOAD_ENDPOINT', 'https://storage.example.com')
    vi.stubEnv('S3_BUCKET', 'outbound-security')
    vi.stubEnv('S3_ACCESS_KEY_ID', 'outbound-security-test')
    vi.stubEnv('S3_SECRET_ACCESS_KEY', 'outbound-security-test-secret')
    vi.stubEnv('S3_SESSION_TOKEN', '')
    vi.stubEnv('NEXTAUTH_URL', 'https://app.example.com')
    vi.stubEnv('INTERNAL_APP_URL', '')
    vi.stubEnv('INTERNAL_TASK_API_BASE_URL', '')

    fetchMock.mockResolvedValue(new Response(Uint8Array.from([1, 2, 3]), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }))

    dnsLookupMock.mockResolvedValue(
      [{ address: '93.184.216.34', family: 4 }] as never,
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('throws structured error on empty input', async () => {
    await expect(normalizeToOriginalMediaUrl('')).rejects.toBeInstanceOf(OutboundImageNormalizeError)
    await expect(normalizeToOriginalMediaUrl('')).rejects.toMatchObject({
      code: 'OUTBOUND_IMAGE_EMPTY_INPUT',
      stage: 'normalize_original',
    })
  })

  it('rejects retired internal api file routes', async () => {
    await expect(normalizeToOriginalMediaUrl('/api/files/images%2Fa.png')).rejects.toMatchObject({
      code: 'OUTBOUND_IMAGE_UNSUPPORTED_INPUT',
      stage: 'normalize_original',
    })
  })

  it('fails explicitly on unsupported root-relative input', async () => {
    await expect(normalizeToOriginalMediaUrl('/foo/bar.png')).rejects.toMatchObject({
      code: 'OUTBOUND_IMAGE_UNSUPPORTED_INPUT',
      stage: 'normalize_original',
    })
  })

  it('rejects private ip outbound urls as unsafe', async () => {
    await expect(normalizeToOriginalMediaUrl('http://127.0.0.1/a.png')).rejects.toMatchObject({
      code: 'OUTBOUND_IMAGE_UNSAFE_URL',
      stage: 'normalize_original',
    })
  })

  it('rejects hostnames whose DNS answer contains a private address', async () => {
    dnsLookupMock.mockResolvedValue(
      [{ address: '10.0.0.8', family: 4 }] as never,
    )
    await expect(normalizeToOriginalMediaUrl('https://attacker.example/a.png')).rejects.toMatchObject({
      code: 'OUTBOUND_IMAGE_UNSAFE_URL',
      stage: 'normalize_original',
    })
  })

  it('resolves transparent-proxy fake IPs through trusted public DNS', async () => {
    dnsLookupMock.mockResolvedValue(
      [{ address: '198.18.0.8', family: 4 }] as never,
    )
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).startsWith('https://cloudflare-dns.com/dns-query')) {
        return new Response(JSON.stringify({
          Answer: [{ type: 1, data: '93.184.216.34' }],
        }), {
          status: 200,
          headers: { 'content-type': 'application/dns-json' },
        })
      }
      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })
    })

    await expect(normalizeToBase64ForGeneration('https://example.com/a.png'))
      .resolves.toBe('data:image/png;base64,AQID')
  })

  it('rejects outbound redirect to private ip', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { location: 'http://127.0.0.1/secret.png' },
      }))

    await expect(normalizeToBase64ForGeneration('https://example.com/a.png')).rejects.toMatchObject({
      code: 'OUTBOUND_IMAGE_UNSAFE_URL',
      stage: 'normalize_base64',
    })
  })

  it('sniffs png mime when upstream returns application/octet-stream', async () => {
    fetchMock.mockResolvedValue(new Response(Uint8Array.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d,
      ]), {
      status: 200,
      headers: { 'content-type': 'application/octet-stream' },
    }))

    const dataUrl = await normalizeToBase64ForGeneration('https://example.com/direct.png')
    expect(dataUrl).toBe('data:image/png;base64,iVBORw0KGgoAAAAN')
  })

  it('sniffs jpeg mime when upstream returns application/octet-stream', async () => {
    fetchMock.mockResolvedValue(new Response(Uint8Array.from([
        0xff, 0xd8, 0xff, 0xe0,
        0x00, 0x10, 0x4a, 0x46,
        0x49, 0x46, 0x00, 0x01,
      ]), {
      status: 200,
      headers: { 'content-type': 'application/octet-stream' },
    }))

    const dataUrl = await normalizeToBase64ForGeneration('https://example.com/direct.jpg')
    expect(dataUrl).toBe('data:image/jpeg;base64,/9j/4AAQSkZJRgAB')
  })

})
