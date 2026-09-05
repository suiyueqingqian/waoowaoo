import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'
import { ensureAiCatalogsRegistered } from '@/lib/ai-exec/catalog-bootstrap'
import { createProjectAgentOperationRegistry } from '@/lib/operations/registry'

ensureAiCatalogsRegistered()
const registry = createProjectAgentOperationRegistry()

describe('production MCP schemas against the JSON Schema standard', () => {
  for (const operation of Object.values(registry).filter((entry) => entry.channels.mcp)) {
    it(`resolves every reference in ${operation.id}`, () => {
      const ajv = new Ajv({ schemaId: 'auto', unknownFormats: 'ignore', logger: false })
      expect(() => ajv.compile(operation.toolInputSchema)).not.toThrow()
    })
  }

  it('represents nested JSON document values without discarding object keys', () => {
    const input = {
      folderPath: null,
      name: 'Document',
      content: { kind: 'structured', data: { title: 'Example', nested: [{ count: 2 }, null, false, 'text'] } },
      references: [],
    }
    const operation = registry.save_project_document
    const validate = new Ajv({ schemaId: 'auto', unknownFormats: 'ignore', logger: false }).compile(operation.toolInputSchema)
    expect(validate(input), JSON.stringify(validate.errors)).toBe(true)
    expect(operation.inputSchema.safeParse(input).success).toBe(true)
  })
})
