// PS-22 · a concept-only pricing specimen.  This module deliberately owns only
// the complete Section 07 fragment; page.mjs mounts it after its existing 06
// section.  The tab contract is the page's existing [data-tabs] protocol:
// without site.mjs every panel remains visible, and site.mjs supplies click and
// left/right-arrow selection when it is present.

const sourceUrl = "https://github.com/lesPrivilege/Courtwork";

function localDiagram() {
  return `<svg viewBox="0 0 300 400" role="img" aria-labelledby="pricing-local-svg-title">
          <title id="pricing-local-svg-title">Local value layer: Matter store, CourtWork, and your provider.</title>
          <g class="pricing-svg-node">
            <rect x="30" y="30" width="240" height="72" rx="8" /><text x="150" y="72">Matter store</text>
            <line x1="150" y1="102" x2="150" y2="150" />
            <rect x="30" y="150" width="240" height="72" rx="8" /><text x="150" y="192">CourtWork</text>
            <line x1="150" y1="222" x2="150" y2="270" />
            <rect x="30" y="270" width="240" height="72" rx="8" /><text x="150" y="312">Your provider</text>
          </g>
        </svg>`;
}

function hostedDiagram() {
  return `<svg viewBox="0 0 300 400" role="img" aria-labelledby="pricing-hosted-svg-title">
          <title id="pricing-hosted-svg-title">Hosted value layer: Local or cloud Matter, CourtWork service, and managed runtime.</title>
          <g class="pricing-svg-node">
            <rect x="30" y="30" width="240" height="72" rx="8" /><text x="150" y="72">Local / cloud Matter</text>
            <line x1="150" y1="102" x2="150" y2="142" />
            <rect x="30" y="142" width="240" height="116" rx="8" />
            <text x="150" y="166">CourtWork service</text><text x="150" y="191">Sync · Eval</text><text x="150" y="230">Managed runtime</text>
            <line x1="150" y1="258" x2="150" y2="298" />
            <rect x="30" y="298" width="240" height="72" rx="8" /><text x="150" y="340">BYOK / managed model</text>
          </g>
        </svg>`;
}

function organizationDiagram() {
  return `<svg viewBox="0 0 300 400" role="img" aria-labelledby="pricing-organization-svg-title">
          <title id="pricing-organization-svg-title">Organization value layer: users, policy and review, Matter governance, Expert runtime, audit, eval, and provenance.</title>
          <g class="pricing-svg-node">
            <rect x="30" y="30" width="240" height="48" rx="8" /><text x="150" y="59">Users</text>
            <line x1="150" y1="78" x2="85" y2="112" /><line x1="150" y1="78" x2="215" y2="112" />
            <rect x="30" y="112" width="110" height="48" rx="8" /><text x="85" y="141">Policy</text>
            <rect x="160" y="112" width="110" height="48" rx="8" /><text x="215" y="141">Review</text>
            <line x1="85" y1="160" x2="150" y2="190" /><line x1="215" y1="160" x2="150" y2="190" />
            <rect x="30" y="190" width="240" height="48" rx="8" /><text x="150" y="219">Matter governance</text>
            <line x1="150" y1="238" x2="150" y2="270" />
            <rect x="30" y="270" width="240" height="44" rx="8" /><text x="150" y="297">Expert runtime</text>
            <line x1="150" y1="314" x2="150" y2="340" />
            <rect x="30" y="340" width="240" height="36" rx="8" /><text x="150" y="363">Audit · Eval · Provenance</text>
          </g>
        </svg>`;
}

export function renderPricing() {
  return `<section class="section pricing" id="pricing" aria-labelledby="pricing-title">
        <p class="index">07</p>
        <p class="pricing-concept">Concept pricing</p>
        <h2 id="pricing-title"><span lang="en">Plans for the way you work</span><span class="zh">从个人工作，到团队协作</span></h2>
        <p class="lede">在本地开始，按自己的节奏扩展。独立工作、托管运行或组织部署，共用一套可追溯的工作基础。</p>
        <blockquote class="pull pricing-premise"><p lang="en">Your work. Your models. Room to grow.</p><p>工作留在手里，模型自由选择。</p></blockquote>

        <div class="pricing-grid">
          <article class="pricing-card pricing-local" aria-labelledby="pricing-local-title">
            <div>
              <h3 id="pricing-local-title" lang="en">Local</h3>
              <p class="pricing-price">$0</p>
              <p class="pricing-status">Open source</p>
              <p class="pricing-summary">Your work stays yours.</p>
              <ul class="pricing-features">
                <li>Local Matter store</li><li>Event log &amp; provenance</li><li>Local runtime, bring your own provider or local models</li><li>Public eval suite</li><li>Exportable schemas</li><li>MIT source</li>
              </ul>
            </div>
            <p class="pricing-action"><a href="${sourceUrl}">View source</a></p>
          </article>

          <article class="pricing-card pricing-professional" aria-labelledby="pricing-professional-title">
            <div>
              <h3 id="pricing-professional-title" lang="en">Professional</h3>
              <p class="pricing-price"><span>$29</span><span class="pricing-price-unit"> / month</span></p>
              <p class="pricing-status">Managed</p>
              <p class="pricing-summary">A maintained professional workbench.</p>
              <ul class="pricing-features">
                <li>Signed desktop builds</li><li>Managed updates</li><li>Cloud sync &amp; backup</li><li>Hosted runtime</li><li>Continuous private eval</li><li>Managed integrations</li><li>Longer history</li>
              </ul>
            </div>
            <p class="pricing-action"><a href="#pricing-tab-hosted">Explore hosted →</a></p>
          </article>

          <article class="pricing-card pricing-organization" aria-labelledby="pricing-organization-title">
            <div>
              <h3 id="pricing-organization-title" lang="en">Organization</h3>
              <p class="pricing-price">Custom</p>
              <p class="pricing-status">Private deployment</p>
              <p class="pricing-summary">Governed work at organizational scale.</p>
              <ul class="pricing-features">
                <li>Shared Matters</li><li>Policy &amp; review controls</li><li>RBAC / SSO</li><li>Audit exports</li><li>Private deployment</li><li>Sovereign-model support</li><li>Expert lifecycle management</li><li>SLA / deployment assistance</li>
              </ul>
            </div>
            <p class="pricing-action"><a href="#pricing-tab-organization">Explore organization →</a></p>
          </article>
        </div>

        <p class="pricing-model-note"><strong>Model usage is separate.</strong> Bring your own provider, use local models, or use managed inference with a spending cap.<br />模型用量另计：自带 provider、用本地模型，或用带上限的托管推理。</p>

        <div class="pricing-tabs tabs" data-tabs="pricing-value">
          <div class="tab-strip" role="tablist" aria-label="Plans for the way you work">
            <button type="button" role="tab" id="pricing-tab-local" aria-controls="pricing-panel-local" aria-selected="true" tabindex="0">Local</button>
            <button type="button" role="tab" id="pricing-tab-hosted" aria-controls="pricing-panel-hosted" aria-selected="false" tabindex="-1">Hosted</button>
            <button type="button" role="tab" id="pricing-tab-organization" aria-controls="pricing-panel-organization" aria-selected="false" tabindex="-1">Organization</button>
          </div>
          <section class="tab-panel pricing-diagram" id="pricing-panel-local" role="tabpanel" aria-labelledby="pricing-tab-local">
            ${localDiagram()}
          </section>
          <section class="tab-panel pricing-diagram" id="pricing-panel-hosted" role="tabpanel" aria-labelledby="pricing-tab-hosted">
            ${hostedDiagram()}
          </section>
          <section class="tab-panel pricing-diagram" id="pricing-panel-organization" role="tabpanel" aria-labelledby="pricing-tab-organization">
            ${organizationDiagram()}
          </section>
        </div>
        <p class="caption">从本地到组织，材料、事件与版本始终随工作同行。</p>
      </section>`;
}
