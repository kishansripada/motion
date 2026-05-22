import { useCallback, useEffect, useRef, useState } from "react";
import { Toolbar } from "@/components/Toolbar";
import { Stage, type VisualNote } from "@/components/Stage";
import { TimelineEditor } from "@/components/TimelineEditor";
import { animations } from "@/registry";

function idFromHash(): string {
   const h = decodeURIComponent(location.hash.replace(/^#/, ""));
   return h || animations[0]?.id || "";
}

const TIMELINE_MIN = 120;
const TIMELINE_MAX_RATIO = 0.75;
const TIMELINE_STORAGE_KEY = "lf-timeline-height";

const RAIL_MIN = 240;
const RAIL_MAX_RATIO = 0.6;
const RAIL_STORAGE_KEY = "lf-rail-width";

function initialTimelineHeight(): number {
   try {
      const raw = localStorage.getItem(TIMELINE_STORAGE_KEY);
      if (raw) {
         const n = Number(raw);
         if (Number.isFinite(n) && n >= TIMELINE_MIN) return n;
      }
   } catch {
      /* ignore */
   }
   return 300;
}

function initialRailWidth(): number {
   try {
      const raw = localStorage.getItem(RAIL_STORAGE_KEY);
      if (raw) {
         const n = Number(raw);
         if (Number.isFinite(n) && n >= RAIL_MIN) return n;
      }
   } catch {
      /* ignore */
   }
   return 360;
}

export function App() {
   const [id, setId] = useState<string>(idFromHash);
   const [reloadToken, setReloadToken] = useState(0);
   const [sizeKb, setSizeKb] = useState<number | null>(null);
   const [timelineH, setTimelineH] = useState<number>(initialTimelineHeight);
   const [visualSelectEnabled, setVisualSelectEnabled] = useState(false);
   const [visualNote, setVisualNote] = useState<VisualNote | null>(null);
   const [visualNoteCopied, setVisualNoteCopied] = useState(false);
   const [detailHost, setDetailHost] = useState<HTMLElement | null>(null);
   const [railW, setRailW] = useState<number>(initialRailWidth);
   const [selectedTarget, setSelectedTarget] = useState<Element | null>(null);
   const frameRef = useRef<HTMLIFrameElement>(null);
   const draggingRef = useRef(false);
   const railDraggingRef = useRef(false);

   const entry = animations.find((a) => a.id === id) ?? animations[0];
   const frameWidth = entry?.frameWidth ?? 1280;
   const frameHeight = entry?.frameHeight ?? 800;

   useEffect(() => {
      const onHash = () => setId(idFromHash());
      window.addEventListener("hashchange", onHash);
      return () => window.removeEventListener("hashchange", onHash);
   }, []);

   useEffect(() => {
      try {
         localStorage.setItem(TIMELINE_STORAGE_KEY, String(timelineH));
      } catch {
         /* ignore */
      }
   }, [timelineH]);

   useEffect(() => {
      try {
         localStorage.setItem(RAIL_STORAGE_KEY, String(railW));
      } catch {
         /* ignore */
      }
   }, [railW]);

   const selectAnimation = useCallback((nextId: string) => {
      location.hash = nextId;
      setId(nextId);
   }, []);

   const getWindow = useCallback(() => frameRef.current?.contentWindow ?? null, []);

   const copyVisualNote = useCallback(async (note: VisualNote) => {
      setVisualNote(note);
      setVisualNoteCopied(false);
      try {
         await navigator.clipboard.writeText(note.message);
         setVisualNoteCopied(true);
      } catch {
         setVisualNoteCopied(false);
      }
   }, []);

   const onSplitterDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      document.body.classList.add("is-resizing-v");
   }, []);

   const onSplitterMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const vh = window.innerHeight;
      const next = vh - e.clientY;
      const max = Math.floor(vh * TIMELINE_MAX_RATIO);
      setTimelineH(Math.max(TIMELINE_MIN, Math.min(max, next)));
   }, []);

   const onSplitterUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = false;
      try {
         (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
         /* ignore */
      }
      document.body.classList.remove("is-resizing-v");
   }, []);

   const onRailSplitterDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      railDraggingRef.current = true;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      document.body.classList.add("is-resizing-h");
   }, []);

   const onRailSplitterMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      if (!railDraggingRef.current) return;
      const vw = window.innerWidth;
      const next = vw - e.clientX;
      const max = Math.floor(vw * RAIL_MAX_RATIO);
      setRailW(Math.max(RAIL_MIN, Math.min(max, next)));
   }, []);

   const onRailSplitterUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      railDraggingRef.current = false;
      try {
         (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
         /* ignore */
      }
      document.body.classList.remove("is-resizing-h");
   }, []);

   return (
      <div className="shell">
         <header className="topbar">
            <Toolbar
               currentId={entry?.id ?? id}
               onChange={selectAnimation}
               onReload={() => setReloadToken((t) => t + 1)}
               sizeKb={sizeKb}
               visualSelectEnabled={visualSelectEnabled}
               onToggleVisualSelect={() => setVisualSelectEnabled((v) => !v)}
            />
         </header>

         <div className="stage-pane">
            <div className="stage-area">
               <Stage
                  ref={frameRef}
                  animationId={entry?.id ?? id}
                  reloadToken={reloadToken}
                  frameWidth={frameWidth}
                  frameHeight={frameHeight}
                  visualSelectEnabled={visualSelectEnabled}
                  onVisualNote={(note) => {
                     void copyVisualNote(note);
                     setVisualSelectEnabled(false);
                  }}
                  selectionTarget={selectedTarget}
                  onLoad={(win) => {
                     try {
                        const doc = win?.document;
                        const size = doc ? doc.documentElement.outerHTML.length : 0;
                        setSizeKb(Math.round(size / 1024));
                     } catch {
                        setSizeKb(null);
                     }
                  }}
               />

               {visualNote ? (
                  <div className="visual-note-panel">
                     <div className="visual-note-title">
                        {visualNote.element ? "Element note" : "Region note"}{" "}
                        {visualNoteCopied ? "copied" : "ready to copy"}
                     </div>
                     <div className="visual-note-meta">
                        {visualNote.animationId} · {visualNote.time.toFixed(2)}s ·{" "}
                        {visualNote.element ? visualNote.element.selector : "region"} · x{visualNote.rect.x} y
                        {visualNote.rect.y} w{visualNote.rect.width} h{visualNote.rect.height}
                     </div>
                     <textarea className="visual-note-text selectable" readOnly value={visualNote.message} />
                     <div className="visual-note-actions">
                        <button onClick={() => void copyVisualNote(visualNote)}>copy prompt</button>
                        <button onClick={() => setVisualNote(null)}>dismiss</button>
                     </div>
                  </div>
               ) : null}
            </div>

            <div
               className="splitter splitter-v"
               role="separator"
               aria-orientation="vertical"
               aria-label="resize inspector"
               onPointerDown={onRailSplitterDown}
               onPointerMove={onRailSplitterMove}
               onPointerUp={onRailSplitterUp}
               onPointerCancel={onRailSplitterUp}
            >
               <div className="splitter-grip" />
            </div>

            <aside
               className="detail-rail"
               ref={setDetailHost}
               aria-label="track inspector"
               style={{ width: `${railW}px` }}
            />
         </div>

         <div
            className="splitter splitter-h"
            role="separator"
            aria-orientation="horizontal"
            aria-label="resize timeline"
            onPointerDown={onSplitterDown}
            onPointerMove={onSplitterMove}
            onPointerUp={onSplitterUp}
            onPointerCancel={onSplitterUp}
         >
            <div className="splitter-grip" />
         </div>

         <div className="timeline-pane" style={{ height: `${timelineH}px` }}>
            <TimelineEditor
               getWindow={getWindow}
               detailHost={detailHost}
               onSelectionChange={setSelectedTarget}
               animationId={entry?.id ?? id}
            />
         </div>
      </div>
   );
}
