import { getPlatformAssistantModelKey, getPlatformEnabledModels } from '@/lib/platform-models/catalog'

const enabled = getPlatformEnabledModels()
const assistantModel = getPlatformAssistantModelKey()

process.stdout.write(`PLATFORM_DEFAULT_MODELS_OK assistant=${assistantModel} pool=${enabled.length}\n`)
