import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { executeElevenLabsVoiceGeneration } from '@/lib/ai-providers/elevenlabs/voice'
import { normalizeMediaOptionsForSelection } from '@/lib/ai-exec/media-preflight'
import { ensureAiCatalogsRegistered } from '@/lib/ai-exec/catalog-bootstrap'
import { ProviderSubmissionError } from '@/lib/ai-exec/submission-error'
import { ProviderHttpError } from '@/lib/ai-providers/failure'
import { startScenarioServer } from '../../helpers/fakes/scenario-server'

const selection = {
  provider: 'elevenlabs', modelId: 'eleven_ttv_v3',
  modelKey: 'elevenlabs::eleven_ttv_v3', variantSubKind: 'official',
} as const
const description = 'A native Mandarin Chinese woman with a warm, clear voice and a relaxed conversational pace.'
const text = '今天我们沿着河边慢慢走，看看远处的山和天空。'.repeat(6)
const endpoint = '/v1/text-to-voice/design'

// Oracle: official Voice Design REST protocol, including text length in Unicode
// characters: https://elevenlabs.io/docs/api-reference/text-to-voice/design
// Only the external provider HTTP endpoint is substituted; no application
// service, Task lifecycle, database or billing implementation is mocked.
describe('provider contract - ElevenLabs Voice Design v3', () => {
  let server: Awaited<ReturnType<typeof startScenarioServer>>
  beforeEach(async () => {
    ensureAiCatalogsRegistered()
    server = await startScenarioServer()
  })
  afterEach(async () => { await server.close() })

  function execute() {
    const options = normalizeMediaOptionsForSelection({
      selection, modality: 'voice', options: { language: 'Auto' },
      voiceInput: { description, text },
    })
    return executeElevenLabsVoiceGeneration({
      userId: 'contract-user', selection, description, text, options,
      providerConfig: { id: 'elevenlabs', name: 'ElevenLabs', apiKey: 'contract-key', baseUrl: server.baseUrl },
    })
  }

  it('sends immutable creative inputs and decodes the first candidate as one audio result', async () => {
    server.defineScenario({
      method: 'POST', path: endpoint, mode: 'success',
      submitResponse: {
        status: 200, headers: { 'request-id': 'contract-request' },
        body: { text, previews: [1, 2, 3].map(index => ({
          audio_base_64: Buffer.from(`candidate-${index}`).toString('base64'),
          generated_voice_id: `preview-${index}`, media_type: 'audio/mpeg',
          duration_secs: 24, language: 'zh',
        })) },
      },
    })
    const result = await execute()
    expect(result).toMatchObject({
      success: true, audioBase64: Buffer.from('candidate-1').toString('base64'),
      audioMimeType: 'audio/mpeg', requestId: 'contract-request',
      metadata: { generatedVoiceId: 'preview-1', providerPreviewCount: 3, previewSelection: 'first' },
    })
    const requests = server.getRequests('POST', endpoint)
    expect(requests).toHaveLength(1)
    expect(requests[0].query).toBe('?output_format=mp3_44100_128')
    expect(requests[0].headers['xi-api-key']).toBe('contract-key')
    expect(JSON.parse(requests[0].bodyText)).toEqual({
      model_id: 'eleven_ttv_v3', voice_description: description, text,
      auto_generate_text: false, stream_previews: false,
    })
  })

  it('validates documented character bounds and refuses unsupported language overrides', () => {
    const validate = (description: string, text: string, language = 'Auto') => normalizeMediaOptionsForSelection({
      selection, modality: 'voice', options: { language }, voiceInput: { description, text },
    })
    expect(() => validate('中'.repeat(20), '𠮷'.repeat(100))).not.toThrow()
    expect(() => validate('中'.repeat(1_000), '𠮷'.repeat(1_000))).not.toThrow()
    for (const [description, text] of [
      ['中'.repeat(19), '中'.repeat(100)], ['中'.repeat(1_001), '中'.repeat(100)],
      ['中'.repeat(20), '𠮷'.repeat(99)], ['中'.repeat(20), '𠮷'.repeat(1_001)],
    ]) expect(() => validate(description, text)).toThrow()
    expect(() => validate(description, text, 'Chinese')).toThrow()
  })

  it.each([
    [401, 'PROVIDER_AUTH_INVALID'], [402, 'PROVIDER_BILLING_REQUIRED'],
    [403, 'PROVIDER_AUTH_INVALID'], [422, 'PROVIDER_SUBMISSION_REJECTED'],
  ])('preserves explicit rejection at HTTP %s', async (status, code) => {
    server.defineScenario({
      method: 'POST', path: endpoint, mode: 'fatal_error',
      submitResponse: { status, body: { detail: { status: 'provider_rejected', message: 'Rejected' } } },
    })
    await expect(execute()).rejects.toMatchObject({
      code, disposition: 'rejected', details: { httpStatus: status, providerCode: 'provider_rejected' },
    })
  })

  it.each([429, 503])('does not authorize re-submission after HTTP %s', async (status) => {
    server.defineScenario({
      method: 'POST', path: endpoint, mode: 'fatal_error',
      submitResponse: { status, body: { detail: { status: 'unavailable' } } },
    })
    const failure: unknown = await execute().catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(ProviderHttpError)
    expect(failure).not.toBeInstanceOf(ProviderSubmissionError)
    expect(server.getRequests('POST', endpoint)).toHaveLength(1)
  })

  it.each([
    { text, previews: [] },
    { text: 'rewritten preview', previews: [{
      audio_base_64: 'YXVkaW8=', generated_voice_id: 'preview',
      media_type: 'audio/mpeg', duration_secs: 2, language: 'zh',
    }] },
  ])('rejects missing audio or rewritten billed text', async body => {
    server.defineScenario({
      method: 'POST', path: endpoint, mode: 'malformed_response', submitResponse: { status: 200, body },
    })
    await expect(execute()).rejects.toThrow()
  })
})
