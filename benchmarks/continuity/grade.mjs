import {isDeepStrictEqual} from 'node:util';

// No application/validator imports. Compare observable consequences to the
// independently declared development oracle, not implementation error codes.
export function grade(expected, observations, error = null) {
  const checks = expected.flatMap((checkpoint, index) => Object.entries(checkpoint).map(([field, wanted]) => ({
    checkpoint: index, field, expected: wanted, actual: observations[index]?.[field] ?? null,
    pass: Object.hasOwn(observations[index] ?? {}, field) && isDeepStrictEqual(wanted, observations[index][field]),
  })));
  const complete = observations.length === expected.length;
  return {pass: !error && complete && checks.length > 0 && checks.every(c => c.pass), complete, checks, error};
}
