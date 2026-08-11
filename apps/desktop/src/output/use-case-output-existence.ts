import { useEffect, useState } from 'react';
import type { CaseBinding } from '../case/case-scope';
import { caseOutputClient } from './case-output-client';
import { DRAFT_OUTPUT_FILE } from './draft-compile';

/**
 * 案件产出目录的存在性询问（GENERIC-SCENARIOS-1「过手即拆」外提：本票触碰了这面的产物名，
 * 故随手把整块状态与 effect 搬出 `App.tsx`）。
 *
 * 语义逐字不变：
 *  - 起草画布产物按**固定中性名**提问——它是「定稿冻结」跨重启成立的唯一依据；
 *  - 合同审查批注稿的固定名**只对样板案**提问；grant 案用版本化名，读不到持久名即视为无产物；
 *  - 窗口重新获得焦点时重新询问宿主：用户在访达删除/替换产物后，冻结不能由一次 true
 *    永久缓存成裸 UI 状态；
 *  - 请求版本号 + cancelled 双闸：切案后到达的旧回执一律丢弃，不让上一枚 matter 的产出
 *    把这一枚写成已定稿。
 */
export function useCaseOutputExistence(input: {
  caseBinding: CaseBinding;
  demoContractOutputFile: string;
}): {
  draftOutputExists: boolean;
  setDraftOutputExists: (exists: boolean) => void;
  demoContractOutputExists: boolean;
  setDemoContractOutputExists: (exists: boolean) => void;
} {
  const [draftOutputExists, setDraftOutputExists] = useState(false);
  const [demoContractOutputExists, setDemoContractOutputExists] = useState(false);
  const { caseBinding, demoContractOutputFile } = input;

  useEffect(() => {
    let cancelled = false;
    let requestVersion = 0;
    setDraftOutputExists(false);
    setDemoContractOutputExists(false);
    if (caseBinding.kind === 'unbound') return;

    const refresh = () => {
      const currentRequest = ++requestVersion;
      void Promise.all([
        caseOutputClient.exists(caseBinding, DRAFT_OUTPUT_FILE),
        caseBinding.kind === 'demo' ? caseOutputClient.exists(caseBinding, demoContractOutputFile) : false,
      ]).then(([draftExists, contractExists]) => {
        if (cancelled || currentRequest !== requestVersion) return;
        setDraftOutputExists(draftExists);
        setDemoContractOutputExists(contractExists);
      }).catch(() => {
        if (cancelled || currentRequest !== requestVersion) return;
        setDraftOutputExists(false);
        setDemoContractOutputExists(false);
      });
    };

    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
    };
  }, [caseBinding, demoContractOutputFile]);

  return { draftOutputExists, setDraftOutputExists, demoContractOutputExists, setDemoContractOutputExists };
}
