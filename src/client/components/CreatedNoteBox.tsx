import CopyButton from "./CopyButton";

export interface CreatedNoteBoxProps {
  noteUrl: string;
}

export default function CreatedNoteBox({ noteUrl }: CreatedNoteBoxProps) {
  return (
    <div className="border border-success/30 bg-success/10 rounded p-3 space-y-2">
      <div className="text-xs text-success font-medium">
        Note created — share this URL
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch">
        <input
          type="text"
          readOnly
          data-testid="note-url"
          onMouseEnter={(e) => (e.target as HTMLInputElement).select()}
          onMouseLeave={() => window.getSelection()?.empty()}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          value={noteUrl}
          className="flex-1 bg-transparent border border-success/40 rounded px-3 py-2 h-10 text-sm font-mono text-center select-all focus:outline-none focus:border-success"
        />
        <CopyButton text={noteUrl} className="gap-2 h-10 sm:w-auto" />
      </div>
    </div>
  );
}
