interface ArchiveConfirmPopoverProps {
  caseTitle: string;
  archived: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ArchiveConfirmPopover({ caseTitle, archived, onConfirm, onCancel }: ArchiveConfirmPopoverProps) {
  return (
    <div className="archive-popover" role="dialog" aria-label={archived ? '取消归档确认' : '归档确认'}>
      <p>
        {archived
          ? `取消归档《${caseTitle}》？取消后将恢复到案件列表的常规视图。`
          : `归档《${caseTitle}》？归档后仍可随时取消归档，案件内容不会被删除。`}
      </p>
      <footer>
        <button className="quiet-button" onClick={onCancel}>取消</button>
        <button className="primary-button" onClick={onConfirm}>{archived ? '取消归档' : '归档'}</button>
      </footer>
    </div>
  );
}
