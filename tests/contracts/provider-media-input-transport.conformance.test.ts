import { describe, expect, it } from 'vitest'
import { listRegisteredAiProviderAdapters } from '@/lib/ai-providers'
import { listProviderMediaInputContracts } from '@/lib/ai-exec/media-input-transport'

describe('Provider media input transport registry conformance', () => {
  it('exhaustively binds every media adapter modality to one transport contract', () => {
    const adapters = listRegisteredAiProviderAdapters()
    const adapterModalities = new Set<string>()
    for (const adapter of adapters) {
      if (adapter.languageModel) adapterModalities.add(`${adapter.providerKey}:vision`)
      if (adapter.image) adapterModalities.add(`${adapter.providerKey}:image`)
      if (adapter.video) adapterModalities.add(`${adapter.providerKey}:video`)
    }

    const contracts = listProviderMediaInputContracts()
    const contractModalities = contracts.map((contract) => `${contract.provider}:${contract.modality}`)
    expect(new Set(contractModalities).size).toBe(contractModalities.length)
    expect(new Set(contractModalities)).toEqual(adapterModalities)

    for (const contract of contracts) {
      const transportEntries = Object.entries(contract.transports)
      expect(transportEntries.length).toBeGreaterThan(0)
      for (const [, transports] of transportEntries) {
        expect(transports && transports.length).toBeGreaterThan(0)
        expect(new Set(transports).size).toBe(transports?.length)
      }
    }
  })
})
