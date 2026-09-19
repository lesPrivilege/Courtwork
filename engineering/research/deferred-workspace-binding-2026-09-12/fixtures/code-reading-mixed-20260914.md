# Mixed Markdown code-reading fixture

Use this same synthetic source as both an assistant/user message and a recorded document. Keep the original Markdown bytes unchanged when rendering or copying.

This paragraph mixes ordinary prose, `repositoryBindingRevision`, `workspaceDir`, `npm --prefix app test`, and the long path `app/server/repository/candidate/files/inline-code-contrast.ts`. The Chinese text `绑定范围` and emoji 😀 should remain ordinary readable text beside the inline identifiers.

> A quoted sentence keeps the surrounding reading rhythm visible while inline code appears nearby: `Host-owned candidate` is still part of this sentence.

| Label | Inline value |
|---|---|
| Revision | `candidateWriteRevision` |
| Command | `node --test app/tests/repository-binding.test.mjs` |

## Fenced code examples

Short block:

```js
const bindingRevision = 16;
const candidateWriteRevision = 3;
```

Unknown-language block:

```courtwork-sample
source: main@pinned-commit
candidate: private-worktree
effect: prepared -> confirmed | unknown
```

Longer block with a deliberately long line:

```ts
type CandidateWriteReceipt = {
  requestId: string;
  candidateId: string;
  candidateRevision: number;
  target: string;
  beforeSha256: string | null;
  afterSha256: string;
  status: "prepared" | "confirmed" | "unknown";
};

const target = "app/server/repository/candidate/files/inline-code-contrast.ts";
const explanatoryLine = "A long code line stays readable at narrow widths and remains horizontally scrollable without changing the copied source bytes.";
```

Final sentence after the fences: code is content to read and copy, not a new state or authority signal.
