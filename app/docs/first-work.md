# First work: a synthetic NDA review

Start the local app using the [repository instructions](../../README.md#本地运行). This walkthrough uses the bundled synthetic Project Cedar material and the host-trusted Inbound NDA Playbook Review extension. It is a workflow exercise; its deterministic rules do not establish legal accuracy.

1. Close the example workspace. In Settings → Models, configure your connection and save its key locally. Choose the model for future runs. Local test needs no key and returns deterministic simulated output; it is useful for checking the setup, but an ordinary request to it does not perform a model-authored NDA review.
2. Create a project and a chat. In Settings → Developer → Extensions, load **Inbound NDA Playbook Review**, then choose **Continue in Matter**. The built-in General profile is sufficient; the extension provides only its admitted tools for this bound chat.
3. Enter a title, then copy the source and facts below into the two matching fields and choose **Continue in Matter**. These fields create the formal source revision; an ordinary chat attachment alone does not bind a Matter.
4. With your configured real model selected, send: “Review this synthetic NDA using the bound playbook and producer contract. Read the approved source with se_read_source. Submit one complete domain proposal through se_submit_candidate. Preserve missing, conflicting or unknown findings. Do not accept the candidate.”
5. When a candidate exists, open **Work review**. Check each finding, its exact recorded source and the transaction facts. Enter a reason and choose the appropriate available decision. Accepting records an Artifact; completing a Run or allowing a tool does not. If a proposal is rejected or a Run fails, inspect the recorded error and correct the input; do not treat a prose reply as a submitted candidate.
6. Create a new chat in the same project. In Settings → Developer, choose **Continue in Matter**, then select the existing Matter rather than filling New work again. Open Work review to see its accepted result, sources and pending work. Ask the model to inspect the current work and use se_read_artifact for the accepted version.

The producer contract describes the required fields, canonical reason templates and reconciliation rules. These are static protocol instructions; the host does not insert a prepared review or relax its source/fact verification. Real provider behavior must still be checked. Keys remain in the local credential store and should never be pasted into a chat or evidence report.

## Source text

```text
SYNTHETIC INBOUND NON-DISCLOSURE AGREEMENT
Disclosing Party: Northstar Bio, Inc.
Receiving Party: Courtwork Holdings Pte. Ltd.
Transaction: Project Cedar acquisition.

1. Purpose. Recipient may use Confidential Information solely to evaluate Project Cedar acquisition.
2. Recipients. Recipient may disclose Confidential Information only to employees and professional advisers with a need to know who are bound by confidentiality obligations at least as protective as this Agreement.
3. Safeguards. Recipient shall maintain reasonable administrative, technical, and physical safeguards and notify Disclosing Party without undue delay after discovering unauthorized access.
4. Term. These confidentiality obligations continue for three years after the Effective Date.
```

## Represented party and transaction facts

```json
{
  "matterId": "synthetic-nda-matter-001",
  "representedParty": "Courtwork Holdings Pte. Ltd.",
  "disclosingParty": "Northstar Bio, Inc.",
  "transaction": {
    "id": "project-cedar",
    "name": "Project Cedar acquisition",
    "purpose": "evaluate Project Cedar acquisition"
  },
  "use": {
    "purpose": "evaluate Project Cedar acquisition"
  },
  "recipients": [
    {
      "name": "Courtwork deal team",
      "kind": "employees",
      "needToKnow": true,
      "boundToConfidentiality": true
    },
    {
      "name": "Harrow LLP",
      "kind": "professional advisers",
      "needToKnow": true,
      "boundToConfidentiality": true
    }
  ],
  "security": {
    "safeguards": "reasonable",
    "noticeHours": 24
  },
  "term": {
    "years": 3
  }
}
```

The example is copied from the versioned [synthetic fixture module](../domains/inbound-nda/fixtures.mjs), not a customer document. The facts' fixture matterId is domain input; the Core creates and owns the actual Matter identity. Correcting transaction facts starts a new binding in this v1 adapter. Source changes use the existing versioned Work action. See the [NDA contract](../../docs/work-core/nda.md) for the precise scope.
