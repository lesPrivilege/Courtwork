import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getPmFixture } from '@courtwork/demo-data';
import { S3_RISK_LIST_RESPONSE } from '@courtwork/legal/testing';
import {
  createRealFixtureGallery,
  LEGAL_RISK_LIST_HASH,
  PM_PRD_REVIEW_HASH,
} from '../../../tests/fixtures/visual-gallery.js';
import { VisualizationGallery } from './VisualizationGallery.js';

async function hashFixture(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

describe('VISUAL-KIT-1 authoritative fixture composition', () => {
  it('locks PM and Legal fixture hashes and injects both namespaces through the same host primitives', async () => {
    const view = createRealFixtureGallery(S3_RISK_LIST_RESPONSE);
    expect(await hashFixture(getPmFixture().artifacts.prdReview)).toBe(PM_PRD_REVIEW_HASH);
    expect(await hashFixture(S3_RISK_LIST_RESPONSE)).toBe(LEGAL_RISK_LIST_HASH);
    expect(view.specimens[0]?.fixture?.hash).toBe(PM_PRD_REVIEW_HASH);
    expect(view.specimens[1]?.fixture?.hash).toBe(LEGAL_RISK_LIST_HASH);

    const html = renderToStaticMarkup(createElement(VisualizationGallery, { view }));
    expect(html).toContain('data-namespace="pm"');
    expect(html).toContain('data-namespace="legal"');
    expect((html.match(/data-primitive="evidence"/g) ?? [])).toHaveLength(2);
    expect((html.match(/data-primitive="status"/g) ?? [])).toHaveLength(5);
    for (const tone of ['neutral', 'generated', 'verified', 'warning', 'critical']) expect(html).toContain(`data-tone="${tone}"`);
    expect(html).toContain(PM_PRD_REVIEW_HASH);
    expect(html).toContain(LEGAL_RISK_LIST_HASH);
    expect(html).toContain('百分之十的违约金');
    expect(html).toContain(getPmFixture().artifacts.prdReview.findings[0]!.sourceAnchors[0]!.quote);
  });
});
