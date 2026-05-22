import { animations, type AnimationEntry } from "@/registry";

type Props = {
   currentId: string;
   onChange: (id: string) => void;
   onReload: () => void;
   sizeKb: number | null;
   visualSelectEnabled: boolean;
   onToggleVisualSelect: () => void;
};

export function Toolbar({
   currentId,
   onChange,
   onReload,
   sizeKb,
   visualSelectEnabled,
   onToggleVisualSelect,
}: Props) {
   const current: AnimationEntry | undefined = animations.find((a) => a.id === currentId);
   return (
      <div className="toolbar">
         <span className="dot" />
         <select value={currentId} onChange={(e) => onChange(e.target.value)}>
            {animations.map((a) => (
               <option key={a.id} value={a.id}>
                  {a.name}
               </option>
            ))}
         </select>
         <span className="info">{sizeKb != null ? `${sizeKb}kb` : ""}</span>
         <button
            className={visualSelectEnabled ? "active" : ""}
            onClick={onToggleVisualSelect}
            title="drag-select a region on the canvas and copy a Cursor-ready prompt"
         >
            {visualSelectEnabled ? "selecting" : "select visual"}
         </button>
         <button onClick={onReload} title="reload iframe">
            reload
         </button>
         <button
            onClick={() => window.open(`/run/${current?.id ?? currentId}.html`, "_blank")}
            title="open iframe source in a new tab"
         >
            open raw
         </button>
      </div>
   );
}
