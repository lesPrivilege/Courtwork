import { useRef, useState } from 'react';

interface NewCaseDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { title: string; fileCount: number }) => void;
}

export function NewCaseDialog({ open, onClose, onCreate }: NewCaseDialogProps) {
  const [step, setStep] = useState<'folder' | 'name'>('folder');
  const [fileCount, setFileCount] = useState(0);
  const [name, setName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setStep('folder');
    setFileCount(0);
    setName('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const relativePath = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
    const folderName = relativePath.split('/')[0] || '新案件';
    setFileCount(files.length);
    setName(folderName);
    setStep('name');
  };

  const skipFolder = () => {
    setFileCount(0);
    setName('');
    setStep('name');
  };

  const confirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate({ title: trimmed, fileCount });
    reset();
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="new-case-dialog" role="dialog" aria-modal="true" aria-labelledby="new-case-title" data-testid="new-case-dialog">
        <h2 id="new-case-title">新建案件</h2>
        {step === 'folder' && <>
          <p>选择案件对应的文件夹，Courtwork 会用文件夹名称作为案件名称建议。</p>
          <button type="button" className="folder-pick-button" onClick={() => fileInputRef.current?.click()}>
            选择案件文件夹
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFolderChange}
            {...{ webkitdirectory: '' } as Record<string, string>}
          />
          <button type="button" className="folder-skip-link" onClick={skipFolder}>不使用文件夹，直接命名</button>
          <footer><button className="quiet-button" onClick={close}>取消</button></footer>
        </>}
        {step === 'name' && <>
          <label className="credential-field">
            <span>案件名称</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              aria-label="案件名称"
              placeholder="例如：张三诉李四买卖合同纠纷"
            />
          </label>
          {fileCount > 0 && <p className="setup-step">已选择 {fileCount} 份文件</p>}
          <footer>
            <button className="quiet-button" onClick={close}>取消</button>
            <button className="primary-button" onClick={confirm} disabled={!name.trim()}>创建案件</button>
          </footer>
        </>}
      </section>
    </div>
  );
}
