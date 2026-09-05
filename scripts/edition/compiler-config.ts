import path from 'node:path'
import type { DeploymentEdition } from '../../src/lib/deployment/edition'

export function createEditionCompilerConfigs(
  projectRoot: string,
  outputDirectory: string,
  edition: DeploymentEdition,
) {
  const rootPath = path.relative(outputDirectory, projectRoot).split(path.sep).join('/') || '.'
  const compilerOptions = {
    baseUrl: rootPath,
    paths: {
      '@/*': ['src/*'],
      '@edition-implementation/*': [edition === 'cloud' ? 'ee/src/edition/*' : 'src/editions/self-hosted/*'],
      ...(edition === 'cloud' ? { '@ee/*': ['ee/src/*'] } : {}),
    },
  }

  return {
    application: {
      extends: `${rootPath}/tsconfig.json`,
      compilerOptions,
      include: [
        `${rootPath}/src/**/*.ts`,
        `${rootPath}/src/**/*.tsx`,
        `${rootPath}/tests/**/*.ts`,
        `${rootPath}/tests/**/*.tsx`,
        ...(edition === 'cloud' ? [`${rootPath}/ee/**/*.ts`, `${rootPath}/ee/**/*.tsx`] : []),
        `${rootPath}/.next-verify/types/**/*.ts`,
        `${rootPath}/.next-verify/dev/types/**/*.ts`,
        `${rootPath}/.next/types/**/*.ts`,
        `${rootPath}/.next/dev/types/**/*.ts`,
        `${rootPath}/next-env.d.ts`,
      ],
      exclude: [
        `${rootPath}/node_modules`,
        `${rootPath}/.next-golden`,
        `${rootPath}/.next-security`,
        `${rootPath}/scripts`,
        `${rootPath}/tmp`,
        ...(edition === 'self-hosted' ? [`${rootPath}/ee`] : []),
      ],
    },
    runtimeScripts: {
      extends: `${rootPath}/tsconfig.runtime-scripts.json`,
      compilerOptions,
    },
  }
}
