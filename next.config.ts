import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path'
import { readFileSync, realpathSync } from 'node:fs'

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

interface EditionNextConfigManifest {
  readonly scriptOrigins: readonly string[]
  readonly frameOrigins: readonly string[]
  readonly imageRemotePatterns: readonly Array<{
    readonly protocol: 'https'
    readonly hostname: string
  }>
}

function readEditionNextConfig(): EditionNextConfigManifest {
  const manifestPath = path.join(process.cwd(), '.generated', 'edition', 'manifest.json')
  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!parsed || typeof parsed !== 'object' || !('nextConfig' in parsed)) {
    throw new Error('Edition manifest is missing nextConfig; run npm run edition:prepare')
  }
  const nextConfig = parsed.nextConfig
  if (!nextConfig || typeof nextConfig !== 'object') {
    throw new Error('Edition manifest nextConfig is invalid')
  }
  const record = nextConfig as Record<string, unknown>
  if (
    !Array.isArray(record.scriptOrigins)
    || !record.scriptOrigins.every((value) => typeof value === 'string')
    || !Array.isArray(record.frameOrigins)
    || !record.frameOrigins.every((value) => typeof value === 'string')
    || !Array.isArray(record.imageRemotePatterns)
  ) {
    throw new Error('Edition manifest nextConfig fields are invalid')
  }
  const imageRemotePatterns = record.imageRemotePatterns.map((value) => {
    if (
      !value
      || typeof value !== 'object'
      || !('protocol' in value)
      || value.protocol !== 'https'
      || !('hostname' in value)
      || typeof value.hostname !== 'string'
    ) {
      throw new Error('Edition manifest imageRemotePatterns entry is invalid')
    }
    return { protocol: 'https' as const, hostname: value.hostname }
  })
  return {
    scriptOrigins: record.scriptOrigins,
    frameOrigins: record.frameOrigins,
    imageRemotePatterns,
  }
}

const editionNextConfig = readEditionNextConfig()

const configuredDistDir = process.env.NEXT_DIST_DIR?.trim() || ''
if (configuredDistDir && (configuredDistDir.startsWith('/') || configuredDistDir.includes('..'))) {
  throw new Error('NEXT_DIST_DIR must be a relative project-local directory')
}

const nextDistDir = configuredDistDir || '.next'
const configuredTypeScriptConfig = process.env.NEXT_TSCONFIG_PATH?.trim()
  || '.generated/edition/tsconfig.json'
if (configuredTypeScriptConfig && (
  configuredTypeScriptConfig.startsWith('/')
  || configuredTypeScriptConfig.includes('..')
  || !configuredTypeScriptConfig.endsWith('.json')
)) {
  throw new Error('NEXT_TSCONFIG_PATH must be a relative project-local JSON file')
}

function sharedDependencyTurbopackRoot(): string | null {
  const projectRoot = process.cwd()
  const dependencyRoot = realpathSync(path.join(projectRoot, 'node_modules'))
  if (dependencyRoot === projectRoot || dependencyRoot.startsWith(`${projectRoot}${path.sep}`)) return null
  const projectParts = projectRoot.split(path.sep)
  const dependencyParts = dependencyRoot.split(path.sep)
  let sharedLength = 0
  while (
    sharedLength < projectParts.length
    && sharedLength < dependencyParts.length
    && projectParts[sharedLength] === dependencyParts[sharedLength]
  ) sharedLength += 1
  return projectParts.slice(0, sharedLength).join(path.sep) || path.parse(projectRoot).root
}

const turbopackRoot = sharedDependencyTurbopackRoot()

const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "form-action 'self'",
      `script-src 'self' 'unsafe-inline'${editionNextConfig.scriptOrigins.length > 0 ? ` ${editionNextConfig.scriptOrigins.join(' ')}` : ''}${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      `frame-src 'self'${editionNextConfig.frameOrigins.length > 0 ? ` ${editionNextConfig.frameOrigins.join(' ')}` : ''}`,
      "worker-src 'self' blob:",
    ].join('; '),
  },
]

const globalFunctionTraceExcludes = [
  './.git/**/*',
  `./${nextDistDir}/cache/**/*`,
  './docker-logs/**/*',
  './logs/**/*',
  './*.log',
]

const nextConfig: NextConfig = {
  serverExternalPackages: ['ffmpeg-ffprobe-static'],
  ...(configuredDistDir ? { distDir: configuredDistDir } : {}),
  typescript: { tsconfigPath: configuredTypeScriptConfig },
  ...(turbopackRoot ? { turbopack: { root: turbopackRoot } } : {}),
  // 已删除 ignoreBuildErrors / ignoreDuringBuilds，构建保持严格门禁
  // allowedDevOrigins 是顶层配置，不属于 experimental
  logging: false,
  devIndicators: false,
  images: {
    remotePatterns: [...editionNextConfig.imageRemotePatterns],
  },
  outputFileTracingExcludes: {
    '/*': globalFunctionTraceExcludes,
    '/api/*': globalFunctionTraceExcludes,
    '/api/**/*': globalFunctionTraceExcludes,
  },
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/logo.ico' }]
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
};

export default withNextIntl(nextConfig);
