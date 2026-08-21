/* global URL */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const probe = readFileSync(new URL('../../scripts/assert-reduced-motion.mjs', import.meta.url), 'utf8');
const capture = readFileSync(new URL('./capture.mjs', import.meta.url), 'utf8');

test('SITE-MOTION-NATURAL-GROWTH-1C runtime probe targets current Pages material', () => {
  for (const selector of ['.tc', '.work-crop[data-reveal] img', '.evidence-step', '.settle-seal', '[data-fixture-count]']) {
    assert.match(probe, new RegExp(selector.replace(/[.[\]{}()*+?^$|\\]/g, '\\$&')));
  }
  assert.match(probe, /getComputedStyle/);
  assert.match(probe, /transitionDuration/);
  assert.match(probe, /getAnimations/);
  assert.doesNotMatch(probe, /\.demo-/);
});

test('SITE-MOTION-NATURAL-GROWTH-1C capture records precise phases and active data selectors', () => {
  assert.match(capture, /\.scenario-proof-stats strong/);
  assert.match(capture, /before/);
  assert.match(capture, /mid/);
  assert.match(capture, /settled/);
  assert.match(capture, /pauseTransitions/);
  assert.match(capture, /targetSha/);
  assert.doesNotMatch(capture, /\.demo-/);
});
