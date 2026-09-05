import { writeFile } from 'node:fs/promises'
import { runFfmpegCommand } from './ffmpeg-command'
import { VIDEO_MERGE_FPS } from '@/lib/workspace-resource/video-merge-contract'

export async function probeVideoDimensions(filePath: string): Promise<{
  readonly width: number
  readonly height: number
}> {
  const result = await runFfmpegCommand('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=p=0:s=x',
    filePath,
  ], { stage: 'workspace_resource_video_merge_probe_dimensions' })
  const [rawWidth, rawHeight] = result.stdout.trim().split('x')
  const width = Number.parseInt(rawWidth ?? '', 10)
  const height = Number.parseInt(rawHeight ?? '', 10)
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    throw new Error('WORKSPACE_RESOURCE_VIDEO_MERGE_DIMENSIONS_INVALID')
  }
  return { width, height }
}

export async function normalizeVideoClip(input: {
  readonly sourcePath: string
  readonly outputPath: string
  readonly durationSeconds: number
  readonly startFrame: number
  readonly frameCount: number
  readonly aspectRatio: string
  readonly width: number
  readonly height: number
}): Promise<void> {
  await runFfmpegCommand('ffmpeg', [
    '-y',
    '-i',
    input.sourcePath,
    '-frames:v',
    String(input.frameCount),
    '-vf',
    `setpts=PTS-STARTPTS,fps=${VIDEO_MERGE_FPS},tpad=stop_mode=clone:stop_duration=1,trim=start_frame=${input.startFrame}:end_frame=${input.startFrame + input.frameCount},setpts=PTS-STARTPTS,scale=${input.width}:${input.height}:force_original_aspect_ratio=decrease,pad=${input.width}:${input.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p,setdar=${input.aspectRatio.replace(':', '/')}`,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    input.outputPath,
  ], {
    stage: 'workspace_resource_video_merge_normalize',
    expectedDurationSeconds: input.durationSeconds,
  })
}

function escapeConcatPath(filePath: string): string {
  return filePath.replace(/'/g, "'\\''")
}

export async function concatVideoClips(input: {
  readonly clipPaths: readonly string[]
  readonly listPath: string
  readonly outputPath: string
  readonly durationSeconds: number
}): Promise<void> {
  if (input.clipPaths.length === 0) {
    throw new Error('WORKSPACE_RESOURCE_VIDEO_MERGE_INPUT_REQUIRED')
  }
  const lines = input.clipPaths.map((clipPath) => `file '${escapeConcatPath(clipPath)}'`).join('\n')
  await writeFile(input.listPath, `${lines}\n`, 'utf8')
  await runFfmpegCommand('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    input.listPath,
    '-c',
    'copy',
    input.outputPath,
  ], {
    stage: 'workspace_resource_video_merge_concat',
    expectedDurationSeconds: input.durationSeconds,
  })
}
