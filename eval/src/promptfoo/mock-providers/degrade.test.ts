import { describe, it, expect } from 'vitest';
import { degradeRiskList, degradeRevisionSet } from './degrade.js';

describe('degradeRiskList', () => {
  it('drops the last risk when there is more than one, simulating a recall miss', () => {
    const expected = { caseId: 'x', risks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };

    const degraded = degradeRiskList(expected);

    expect(degraded.risks).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('leaves a single-risk or empty risk list untouched', () => {
    const single = { caseId: 'x', risks: [{ id: 'a' }] };
    const empty = { caseId: 'x', risks: [] };

    expect(degradeRiskList(single)).toEqual(single);
    expect(degradeRiskList(empty)).toEqual(empty);
  });
});

describe('degradeRevisionSet', () => {
  it('strips citations from every instruction annotation, simulating an uncited draft', () => {
    const expected = {
      instructions: [
        { id: 'i1', annotation: { text: 't', citations: [{ citation: 'x' }] } },
        { id: 'i2' },
      ],
    };

    const degraded = degradeRevisionSet(expected);
    const instructions = degraded.instructions ?? [];

    expect((instructions[0] as { annotation: { citations: unknown[] } }).annotation.citations).toEqual([]);
    expect(instructions[1]).toEqual({ id: 'i2' });
  });
});
