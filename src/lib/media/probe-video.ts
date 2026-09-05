import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { probeMediaDurationSeconds } from '@/lib/video-compose/ffmpeg-command'
import { probeVideoDimensions } from '@/lib/video-compose/video-merge-ffmpeg'

/**
 * Duration and frame size of an in-memory video, read by ffprobe from one
 * temporary file. Uploaded videos need both facts at registration time:
 * duration gates reference-video capabilities, size drives the Canvas frame.
 */
export async function probeVideoBufferFacts(input: {
  readonly buffer: Uint8Array
  readonly extension: string
  readonly stage: string
}): Promise<{ readonly durationMs: number; readonly width: number; readonly height: number }> {
  const extension = input.extension.trim().toLowerCase()
  if (!/^[a-z0-9]+$/u.test(extension)) throw new Error('MEDIA_VIDEO_PROBE_EXTENSION_INVALID')
  const workDir = await mkdtemp(path.join(tmpdir(), 'waoowaoo-video-probe-'))
  try {
    const sourcePath = path.join(workDir, `source.${extension}`)
    await writeFile(sourcePath, input.buffer)
    const [durationSeconds, dimensions] = await Promise.all([
      probeMediaDurationSeconds(sourcePath, input.stage),
      probeVideoDimensions(sourcePath),
    ])
    const durationMs = Math.round(durationSeconds * 1000)
    if (!Number.isSafeInteger(durationMs) || durationMs <= 0) {
      throw new Error('MEDIA_VIDEO_DURATION_INVALID')
    }
    return { durationMs, width: dimensions.width, height: dimensions.height }
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
