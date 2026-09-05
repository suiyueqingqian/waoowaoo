import { ProviderSubmissionError } from '@/lib/ai-exec/submission-error'
import type { UnifiedErrorCode } from '@/lib/errors/codes'
import { captureProviderHttpFailure, ProviderHttpError } from '@/lib/ai-providers/failure'

function rejectedSubmissionCode(status: number): UnifiedErrorCode {
  if (status === 401 || status === 403) return 'PROVIDER_AUTH_INVALID'
  if (status === 402) return 'PROVIDER_BILLING_REQUIRED'
  return 'PROVIDER_SUBMISSION_REJECTED'
}

function providerMachineCode(error: ProviderHttpError): string | null {
  const payload = error.errorEnvelope
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return error.code
  const detail = Reflect.get(payload, 'detail')
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return error.code
  const status = Reflect.get(detail, 'status')
  return typeof status === 'string' && status.trim() ? status.trim().slice(0, 256) : error.code
}

export async function throwElevenLabsHttpFailure(response: Response): Promise<never> {
  const error = await captureProviderHttpFailure({
    response,
    provider: 'elevenlabs',
    phase: 'submit',
  })
  if ([401, 402, 403, 422].includes(response.status)) {
    throw new ProviderSubmissionError(
      rejectedSubmissionCode(response.status),
      response.status === 422
        ? 'ElevenLabs rejected the generation parameters'
        : `ElevenLabs rejected the generation request (HTTP ${String(response.status)})`,
      {
        disposition: 'rejected',
        provider: 'elevenlabs',
        details: {
          httpStatus: response.status,
          providerCode: providerMachineCode(error),
        },
        cause: error,
      },
    )
  }
  throw error
}
