import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { toDraft202012JsonSchema } from './json-schema-export.js';

describe('toDraft202012JsonSchema（ABI-2A wire schema 出口）', () => {
  it('显式导出 Draft 2020-12', () => {
    const schema = toDraft202012JsonSchema(z.object({ value: z.string() }));

    expect(schema).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
    });
  });

  it('不可表达的 Zod 节点 fail closed，不得退成任意 JSON', () => {
    expect(() => toDraft202012JsonSchema(z.date())).toThrow(/cannot be represented/i);
  });
});
