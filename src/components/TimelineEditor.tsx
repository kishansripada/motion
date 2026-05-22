import {
   Fragment,
   useCallback,
   useEffect,
   useLayoutEffect,
   useMemo,
   useRef,
   useState,
   type MouseEvent as ReactMouseEvent,
   type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useTimeline } from "@/hooks/useTimeline";
import type { TimelineChild, TimelineSnapshot } from "@/hooks/useTimeline";
import type { PureKeyframeView } from "@framework";

type Props = {
   getWindow: () => Window | null;
   /**
    * DOM node into which the per-track detail panel is portaled. When null, no
    * inspector is shown — the editor only renders the rows + transport bar.
    */
   detailHost?: HTMLElement | null;
   /**
    * Called whenever the selected track changes, with the live DOM element
    * being animated by that track (or `null` when nothing is selected). Used
    * by the parent shell to render a selection halo on top of the canvas.
    */
   onSelectionChange?: (target: Element | null) => void;
   /**
    * The id of the animation currently mounted in the iframe. Used in the
    * right-click "copy a blurb" feature so the produced text tells the AI
    * exactly which animation source file to look at.
    */
   animationId?: string;
};

type FrameHost = Window & {
   lfTimeline?: { paused(): boolean; progress(): number };
   lfPause?: () => void;
   lfResume?: () => void;
   lfReplay?: () => void;
   lfProgress?: (v?: number) => number;
   lfSeek?: (seconds: number) => number;
};

function fmt(s: number) {
   return (s || 0).toFixed(2);
}

const TEXT_INPUT_TYPES = new Set([
   "date",
   "datetime-local",
   "email",
   "month",
   "number",
   "password",
   "search",
   "tel",
   "text",
   "time",
   "url",
   "week",
]);

function eventTargetElement(t: EventTarget | null): Element | null {
   if (!t) return null;
   if (typeof (t as Element).closest === "function") return t as Element;
   const parent = (t as { parentElement?: Element | null }).parentElement;
   return parent && typeof parent.closest === "function" ? parent : null;
}

function isSpaceKey(e: KeyboardEvent): boolean {
   return e.key === " " || e.code === "Space";
}

/** Don't hijack Space when the user is typing text. */
function isTextEntryTarget(t: EventTarget | null): boolean {
   const target = eventTargetElement(t);
   if (!target) return false;

   if ((target as HTMLElement).isContentEditable) return true;

   const contentEditable = target.closest("[contenteditable]");
   if (contentEditable) {
      const value = contentEditable.getAttribute("contenteditable")?.toLowerCase();
      return value !== "false";
   }

   const tag = target.tagName.toUpperCase();
   if (tag === "TEXTAREA") {
      const textarea = target as HTMLTextAreaElement;
      return !textarea.disabled && !textarea.readOnly;
   }

   if (tag !== "INPUT") return false;
   const input = target as HTMLInputElement;
   const type = (input.getAttribute("type") ?? "text").toLowerCase();
   return !input.disabled && !input.readOnly && TEXT_INPUT_TYPES.has(type);
}

/** Find a node by path-key anywhere in the tree. */
function findNode(roots: TimelineChild[], key: string): TimelineChild | null {
   for (const r of roots) {
      if (r.key === key) return r;
      if (r.children) {
         const hit = findNode(r.children, key);
         if (hit) return hit;
      }
   }
   return null;
}

/**
 * Flatten the tree to the list of rows that should render *right now*,
 * given the expansion set and the current focus scope.
 *
 * - If `focusKey` is set, only descendants of that node (including deeper
 *   levels) are emitted; the rest of the tree is ignored.
 * - Only children of expanded folders are emitted. When focusing, the focus
 *   node's direct children are always considered visible (the focus itself
 *   is the "scope"; you don't need to click to expand it).
 */
function flattenVisible(roots: TimelineChild[], expanded: Set<string>, focusKey: string | null): TimelineChild[] {
   const out: TimelineChild[] = [];
   const focusNode = focusKey ? findNode(roots, focusKey) : null;
   const startingList = focusNode?.children ?? roots;
   const baseDepth = focusNode ? focusNode.depth + 1 : 0;
   const walk = (nodes: TimelineChild[]) => {
      for (const n of nodes) {
         out.push({ ...n, depth: n.depth - baseDepth });
         if (n.children && expanded.has(n.key)) walk(n.children);
      }
   };
   walk(startingList);
   return out;
}

/** Ancestors of `key` from the tree, root-first, *excluding* the node itself. */
function ancestorsOf(roots: TimelineChild[], key: string): TimelineChild[] {
   const trail: TimelineChild[] = [];
   const dfs = (nodes: TimelineChild[]): boolean => {
      for (const n of nodes) {
         if (n.key === key) return true;
         if (n.children) {
            trail.push(n);
            if (dfs(n.children)) return true;
            trail.pop();
         }
      }
      return false;
   };
   dfs(roots);
   return trail;
}

/**
 * Builds the "track" section of a copy-blurb — common to row and keyframe
 * blurbs. Returns plain lines so callers can splice them into a larger
 * paragraph without dealing with trailing newlines.
 */
function trackLines(row: TimelineChild, ancestors: TimelineChild[]): string[] {
   const lines: string[] = [];
   const path = [...ancestors.map((a) => a.label), row.label].join(" › ");
   lines.push(`- label: \`${row.label}\``);
   lines.push(`- kind: ${row.kind}`);
   lines.push(`- path: ${path}`);
   lines.push(
      `- time: ${row.absoluteStart.toFixed(2)}s → ${(row.absoluteStart + row.duration).toFixed(2)}s · duration ${row.duration.toFixed(2)}s`,
   );
   const d = row.detail;
   if (d.ease) lines.push(`- ease: ${d.ease}`);
   if (d.repeat) lines.push(`- repeat: ${d.repeat}`);
   if (d.stagger) lines.push(`- stagger: ${d.stagger}`);
   const holdCount = d.keyframes?.filter((kf) => kf.hold).length ?? 0;
   if (holdCount) lines.push(`- holds: ${holdCount}`);
   if (d.targets.length) {
      const head = d.targets
         .slice(0, 4)
         .map((t) => `\`${t}\``)
         .join(", ");
      const tail = d.targets.length > 4 ? ` +${d.targets.length - 4}` : "";
      lines.push(`- targets (${d.targets.length}): ${head}${tail}`);
   }
   if (!d.keyframes && d.props.length) {
      const pairs = d.props.map((p) => `${p}: ${d.propValues[p]}`).join(", ");
      lines.push(`- props: { ${pairs} }`);
   }
   if (d.isTimeline) lines.push(`- nested tweens: ${d.nestedCount}`);
   return lines;
}

function blurbHeader(animationId?: string): string[] {
   const lines = [`I'm in the motion timeline editor.`];
   if (animationId) lines.push(`Animation: \`${animationId}\` (animations/${animationId}/)`);
   return lines;
}

function buildKeyframeBlurb(opts: {
   animationId?: string;
   row: TimelineChild;
   ancestors: TimelineChild[];
   kf: PureKeyframeView;
   kfIndex: number;
   kfCount: number;
}): string {
   const { animationId, row, ancestors, kf, kfIndex, kfCount } = opts;
   const lines = blurbHeader(animationId);
   lines.push("");
   lines.push(`Pointing at: keyframe #${kfIndex + 1} of ${kfCount} on \`${row.label}\` at \`${kf.time.toFixed(2)}s\`.`);
   lines.push("");
   lines.push(`Keyframe:`);
   lines.push(`- index: ${kfIndex} (of ${kfCount})`);
   lines.push(`- absolute time: ${kf.time.toFixed(2)}s`);
   lines.push(`- local time (within track): ${kf.localTime.toFixed(2)}s`);
   if (kf.hold) lines.push(`- incoming transition: HOLD (no property changes)`);
   if (kf.curve) lines.push(`- incoming curve: ${kf.curve}`);
   const stateEntries = Object.entries(kf.state ?? {});
   if (stateEntries.length) {
      const pairs = stateEntries.map(([p, v]) => `${p}: ${v}`).join(", ");
      lines.push(`- state: { ${pairs} }`);
   } else {
      lines.push(`- state: ∅`);
   }
   lines.push("");
   lines.push(`Track:`);
   lines.push(...trackLines(row, ancestors));
   lines.push("");
   lines.push(`Please modify this keyframe (or the surrounding track) in the animation source.`);
   return lines.join("\n");
}

function buildRowBlurb(opts: {
   animationId?: string;
   row: TimelineChild;
   ancestors: TimelineChild[];
   clickTime: number;
}): string {
   const { animationId, row, ancestors, clickTime } = opts;
   const lines = blurbHeader(animationId);
   lines.push("");
   const localT = clickTime - row.absoluteStart;
   const within = localT >= 0 && localT <= row.duration + 1e-6;
   lines.push(
      `Pointing at: ${row.kind} \`${row.label}\` at \`${clickTime.toFixed(2)}s\`${within ? ` (local ${localT.toFixed(2)}s into the track)` : ""}.`,
   );
   lines.push("");
   lines.push(`Track:`);
   lines.push(...trackLines(row, ancestors));
   lines.push("");
   lines.push(`Please look at this ${row.kind} in the animation source.`);
   return lines.join("\n");
}

function buildTimeBlurb(opts: {
   animationId?: string;
   clickTime: number;
   focusNode: TimelineChild | null;
   focusAncestors: TimelineChild[];
   snapshot: TimelineSnapshot;
}): string {
   const { animationId, clickTime, focusNode, focusAncestors, snapshot } = opts;
   const lines = blurbHeader(animationId);
   lines.push("");
   lines.push(`Pointing at: empty timeline space at \`${clickTime.toFixed(2)}s\`.`);
   lines.push(`Total duration: ${snapshot.duration.toFixed(2)}s`);
   if (focusNode) {
      const path = [...focusAncestors.map((a) => a.label), focusNode.label].join(" › ");
      lines.push(
         `Focused scope: \`${path}\` (${focusNode.absoluteStart.toFixed(2)}s → ${(focusNode.absoluteStart + focusNode.duration).toFixed(2)}s)`,
      );
   }
   const nearby = snapshot.labels
      .map((l) => ({ ...l, dist: Math.abs(l.t - clickTime) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 4);
   if (nearby.length) {
      lines.push("");
      lines.push(`Nearest GSAP labels:`);
      for (const l of nearby) lines.push(`- \`${l.name}\` at ${l.t.toFixed(2)}s`);
   }
   lines.push("");
   lines.push(`Please look at what's animating at this point in time.`);
   return lines.join("\n");
}

export function TimelineEditor({ getWindow, detailHost = null, onSelectionChange, animationId }: Props) {
   const { present, snapshot, progress, time, duration, paused } = useTimeline(getWindow);
   const rowsInnerRef = useRef<HTMLDivElement>(null);
   const draggingRef = useRef(false);
   const [selectedKey, setSelectedKey] = useState<string | null>(null);
   const [expanded, setExpanded] = useState<Set<string>>(new Set());
   const [focusKey, setFocusKey] = useState<string | null>(null);
   const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
   const toastTimerRef = useRef<number | null>(null);

   useEffect(
      () => () => {
         if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      },
      [],
   );

   const showToast = useCallback((text: string) => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      setToast({ text, key: Date.now() });
      toastTimerRef.current = window.setTimeout(() => setToast(null), 1800);
   }, []);

   const copyBlurb = useCallback(
      async (text: string) => {
         try {
            await navigator.clipboard.writeText(text);
            showToast("copied — paste to your AI");
         } catch {
            showToast("copy failed");
         }
      },
      [showToast],
   );

   const win = useCallback(() => getWindow() as FrameHost | null, [getWindow]);

   const togglePlayPause = useCallback(() => {
      const w = win();
      if (!w?.lfTimeline) return;
      if (w.lfTimeline.paused() || w.lfTimeline.progress() >= 1) {
         w.lfResume?.();
      } else {
         w.lfPause?.();
      }
   }, [win]);

   const shortcutFrameWindow = win();

   // Global keyboard shortcuts: spacebar play/pause, Escape clears selection
   // (then focus). Space is captured before focused controls can turn it into
   // a click/dropdown action, except while the user is typing text.
   useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
         if (isSpaceKey(e)) {
            if (isTextEntryTarget(e.target)) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (!e.repeat) togglePlayPause();
            return;
         }
         if (isTextEntryTarget(e.target)) return;
         if (e.key === "Escape") {
            // Two-step: clear selection first, then focus mode on a second press.
            setSelectedKey((k) => {
               if (k != null) return null;
               setFocusKey(null);
               return null;
            });
         }
      };

      const onKeyUp = (e: KeyboardEvent) => {
         if (!isSpaceKey(e) || isTextEntryTarget(e.target)) return;
         e.preventDefault();
         e.stopPropagation();
         e.stopImmediatePropagation();
      };

      const targets = new Set<Window>([window]);
      if (shortcutFrameWindow && shortcutFrameWindow !== window) targets.add(shortcutFrameWindow);

      targets.forEach((target) => {
         target.addEventListener("keydown", onKeyDown, true);
         target.addEventListener("keyup", onKeyUp, true);
      });
      return () => {
         targets.forEach((target) => {
            target.removeEventListener("keydown", onKeyDown, true);
            target.removeEventListener("keyup", onKeyUp, true);
         });
      };
   }, [shortcutFrameWindow, togglePlayPause]);

   // Clear stale selection/expansion/focus when the underlying timeline
   // instance is swapped out (loop rebuild).
   const snapshotId = snapshot;
   useEffect(() => {
      if (!snapshot) {
         setSelectedKey(null);
         setExpanded(new Set());
         setFocusKey(null);
         return;
      }
      if (selectedKey != null && !findNode(snapshot.children, selectedKey)) {
         setSelectedKey(null);
      }
      if (focusKey != null && !findNode(snapshot.children, focusKey)) {
         setFocusKey(null);
      }
      if (expanded.size > 0) {
         const keep = new Set<string>();
         expanded.forEach((k) => {
            if (findNode(snapshot.children, k)) keep.add(k);
         });
         if (keep.size !== expanded.size) setExpanded(keep);
      }
      // We intentionally only re-run on snapshot identity, not on state changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [snapshotId]);

   const focusNode: TimelineChild | null = useMemo(
      () => (snapshot && focusKey ? findNode(snapshot.children, focusKey) : null),
      [snapshot, focusKey],
   );

   const visibleRows = useMemo<TimelineChild[]>(
      () => (snapshot ? flattenVisible(snapshot.children, expanded, focusKey) : []),
      [snapshot, expanded, focusKey],
   );

   const selected: TimelineChild | null = useMemo(() => {
      if (!snapshot || selectedKey == null) return null;
      return findNode(snapshot.children, selectedKey);
   }, [snapshot, selectedKey]);

   // Publish the selected element up to the shell so it can render a halo on
   // the canvas. Held in a ref so changes to the parent's callback don't
   // re-fire selection events spuriously.
   const onSelectionChangeRef = useRef(onSelectionChange);
   onSelectionChangeRef.current = onSelectionChange;
   const selectedTargetEl = selected?.targetEl ?? null;
   useEffect(() => {
      onSelectionChangeRef.current?.(selectedTargetEl);
   }, [selectedTargetEl]);

   // Visible time window in absolute (root-relative) seconds. When focused
   // on a sub-timeline, bars and the playhead are scaled to just that
   // sub-window so you get pixel-level precision on small nested moves.
   const totalDur = (snapshot?.duration ?? 0) || 1;
   const viewStart = focusNode ? focusNode.absoluteStart : 0;
   const viewEnd = focusNode ? focusNode.absoluteStart + focusNode.duration : totalDur;
   const viewDur = Math.max(0.0001, viewEnd - viewStart);

   // Map absolute seconds → percent of visible track.
   const timeToPercent = useCallback(
      (absSeconds: number) => ((absSeconds - viewStart) / viewDur) * 100,
      [viewStart, viewDur],
   );

   const seekFromClientX = useCallback(
      (clientX: number) => {
         const inner = rowsInnerRef.current;
         if (!inner) return;
         const rect = inner.getBoundingClientRect();
         const cs = getComputedStyle(inner);
         const gutterPx = parseFloat(cs.getPropertyValue("--lf-gutter")) || 180;
         const tx = clientX - rect.left - gutterPx;
         const tw = rect.width - gutterPx;
         const localFrac = Math.max(0, Math.min(1, tx / tw));
         const absSeconds = viewStart + localFrac * viewDur;
         const globalFrac = Math.max(0, Math.min(1, absSeconds / totalDur));
         win()?.lfProgress?.(globalFrac);
      },
      [win, viewStart, viewDur, totalDur],
   );

   const toggleExpanded = useCallback((key: string) => {
      setExpanded((prev) => {
         const next = new Set(prev);
         if (next.has(key)) next.delete(key);
         else next.add(key);
         return next;
      });
   }, []);

   // Keep focus ancestors expanded so the breadcrumb back-navigation leaves
   // the user in a consistent place.
   const focusInto = useCallback(
      (key: string) => {
         if (!snapshot) return;
         const trail = ancestorsOf(snapshot.children, key);
         setExpanded((prev) => {
            const next = new Set(prev);
            for (const a of trail) next.add(a.key);
            next.add(key);
            return next;
         });
         setFocusKey(key);
         setSelectedKey(null);
      },
      [snapshot],
   );

   if (!present || !snapshot) return null;

   const crumbs = focusNode ? [null, ...ancestorsOf(snapshot.children, focusNode.key), focusNode] : [null];

   // Resolve a contextmenu event inside `.timeline-rows-inner` to a copy-blurb.
   // Tries to identify (in priority order):
   //   1. A keyframe marker — by computing the click x in track-pixels and
   //      finding the nearest kf within ~6px (markers themselves have
   //      `pointer-events: none` so we can't rely on the DOM target).
   //   2. A row — when the click is inside any `.timeline-row`.
   //   3. Empty space — falls back to a "what's at this time" blurb.
   const onRowsContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!snapshot) return;
      const inner = rowsInnerRef.current;
      if (!inner) return;
      const target = e.target as HTMLElement;

      // Skip the chevron / focus buttons — those are UI affordances and the
      // browser's native context menu is more useful there.
      if (target.closest("[data-chev-key]") || target.closest("[data-focus-key]")) return;

      const rect = inner.getBoundingClientRect();
      const cs = getComputedStyle(inner);
      const gutterPx = parseFloat(cs.getPropertyValue("--lf-gutter")) || 180;
      const trackLeft = rect.left + gutterPx;
      const trackWidth = Math.max(1, rect.width - gutterPx);
      const tx = e.clientX - trackLeft;
      const inTrack = tx >= 0 && tx <= trackWidth;
      const localFrac = Math.max(0, Math.min(1, tx / trackWidth));
      const absSeconds = viewStart + localFrac * viewDur;

      const rowEl = target.closest<HTMLElement>(".timeline-row");
      const rowKey = rowEl?.querySelector<HTMLElement>("[data-bar-key]")?.getAttribute("data-bar-key") ?? null;

      // Keyframe proximity: only attempt when we're inside a row's track AND
      // the row exposes keyframes. The same x→time conversion used for scrub
      // is reused here so the geometry is consistent.
      if (rowKey && inTrack) {
         const row = findNode(snapshot.children, rowKey);
         const kfs = row?.detail.keyframes ?? null;
         if (row && kfs && kfs.length > 0) {
            const tolPx = 7;
            let best: { kf: PureKeyframeView; index: number; distPx: number } | null = null;
            for (let i = 0; i < kfs.length; i++) {
               const kf = kfs[i];
               const pct = ((kf.time - viewStart) / viewDur) * 100;
               if (pct < -1 || pct > 101) continue;
               const kfX = trackLeft + (pct / 100) * trackWidth;
               const dist = Math.abs(e.clientX - kfX);
               if (!best || dist < best.distPx) best = { kf, index: i, distPx: dist };
            }
            if (best && best.distPx <= tolPx) {
               e.preventDefault();
               const ancestors = ancestorsOf(snapshot.children, row.key);
               const text = buildKeyframeBlurb({
                  animationId,
                  row,
                  ancestors,
                  kf: best.kf,
                  kfIndex: best.index,
                  kfCount: kfs.length,
               });
               void copyBlurb(text);
               return;
            }
         }
      }

      if (rowKey) {
         const row = findNode(snapshot.children, rowKey);
         if (row) {
            e.preventDefault();
            const ancestors = ancestorsOf(snapshot.children, row.key);
            const text = buildRowBlurb({ animationId, row, ancestors, clickTime: absSeconds });
            void copyBlurb(text);
            return;
         }
      }

      // Empty space inside the rows pane — copy a "what's at this time" blurb.
      e.preventDefault();
      const focusAncestors = focusNode ? ancestorsOf(snapshot.children, focusNode.key) : [];
      const text = buildTimeBlurb({ animationId, clickTime: absSeconds, focusNode, focusAncestors, snapshot });
      void copyBlurb(text);
   };

   const onCopyKeyframeFromInspector = (kfIndex: number) => {
      if (!snapshot || !selected) return;
      const kfs = selected.detail.keyframes;
      if (!kfs || kfIndex < 0 || kfIndex >= kfs.length) return;
      const ancestors = ancestorsOf(snapshot.children, selected.key);
      const text = buildKeyframeBlurb({
         animationId,
         row: selected,
         ancestors,
         kf: kfs[kfIndex],
         kfIndex,
         kfCount: kfs.length,
      });
      void copyBlurb(text);
   };

   return (
      <div className="timeline-editor">
         <header className="timeline-transport">
            <button onClick={togglePlayPause} title="play / pause (space)">
               {paused ? "▶" : "⏸"}
            </button>
            <button onClick={() => win()?.lfReplay?.()} title="restart cycle">
               ↺
            </button>
            <span className="tc">
               {fmt(time)} / {fmt(duration)}
            </span>
            <Breadcrumb crumbs={crumbs} onJump={(k) => (k ? setFocusKey(k) : setFocusKey(null))} />
            <span className="timeline-size">
               {visibleRows.length} row{visibleRows.length === 1 ? "" : "s"}
            </span>
         </header>

         {detailHost
            ? createPortal(
                 selected ? (
                    <DetailPanel
                       row={selected}
                       currentTime={time}
                       onClose={() => setSelectedKey(null)}
                       onSeek={(absT) => win()?.lfProgress?.(Math.max(0, Math.min(1, absT / totalDur)))}
                       onFocus={() => selected.children && selected.children.length > 0 && focusInto(selected.key)}
                       onCopyKeyframe={onCopyKeyframeFromInspector}
                    />
                 ) : (
                    <DetailPlaceholder />
                 ),
                 detailHost,
              )
            : null}

         <div className="timeline-rows">
            <div
               className="timeline-rows-inner"
               ref={rowsInnerRef}
               onContextMenu={onRowsContextMenu}
               onPointerDown={(e) => {
                  // Ignore non-primary buttons so right-click flows entirely
                  // through `onContextMenu` (copy a blurb) without stealing
                  // selection or scrubbing the playhead.
                  if (e.button !== 0) return;
                  const target = e.target as HTMLElement;

                  // Disclosure chevron — does NOT select or scrub.
                  const chev = target.closest<HTMLElement>("[data-chev-key]");
                  if (chev) {
                     e.stopPropagation();
                     toggleExpanded(chev.getAttribute("data-chev-key")!);
                     return;
                  }

                  const focusBtn = target.closest<HTMLElement>("[data-focus-key]");
                  if (focusBtn) {
                     e.stopPropagation();
                     focusInto(focusBtn.getAttribute("data-focus-key")!);
                     return;
                  }

                  const bar = target.closest<HTMLElement>("[data-bar-key]");
                  if (bar) {
                     const key = bar.getAttribute("data-bar-key")!;
                     setSelectedKey(key);
                     const row = findNode(snapshot.children, key);
                     if (row) {
                        win()?.lfProgress?.(Math.max(0, Math.min(1, row.absoluteStart / totalDur)));
                     }
                     return;
                  }
                  // Clicking inside a row's label (but not on a button) selects
                  // that row without scrubbing — the whole row is a click target.
                  const labelRow = target.closest<HTMLElement>(".timeline-row");
                  if (labelRow && target.closest(".timeline-label")) {
                     const labelKey = labelRow
                        .querySelector<HTMLElement>("[data-bar-key]")
                        ?.getAttribute("data-bar-key");
                     if (labelKey) setSelectedKey(labelKey);
                     return;
                  }
                  // Empty timeline track: deselect AND scrub.
                  setSelectedKey(null);
                  draggingRef.current = true;
                  (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                  seekFromClientX(e.clientX);
               }}
               onPointerMove={(e) => {
                  if (!draggingRef.current) return;
                  seekFromClientX(e.clientX);
               }}
               onPointerUp={() => {
                  draggingRef.current = false;
               }}
               onPointerCancel={() => {
                  draggingRef.current = false;
               }}
            >
               {visibleRows.map((c) => {
                  const left = timeToPercent(c.absoluteStart);
                  const right = timeToPercent(c.absoluteStart + c.duration);
                  // Clip bars that spill outside the focus window instead of
                  // letting them reach to -50% or +200%.
                  const leftClipped = Math.max(0, left);
                  const rightClipped = Math.min(100, right);
                  const width = Math.max(0.25, rightClipped - leftClipped);
                  const isSelected = selectedKey === c.key;
                  const isExpanded = expanded.has(c.key);
                  const hasChildren = c.children != null && c.children.length > 0;
                  return (
                     <div key={c.key} className={`timeline-row${isSelected ? " is-selected" : ""}`}>
                        <div
                           className="timeline-label"
                           style={{ paddingLeft: 10 + c.depth * 14 }}
                           title={`${c.label}  ·  ${c.absoluteStart.toFixed(2)}s → ${(c.absoluteStart + c.duration).toFixed(2)}s`}
                        >
                           {hasChildren ? (
                              <button
                                 type="button"
                                 className={`timeline-chev${isExpanded ? " is-open" : ""}`}
                                 data-chev-key={c.key}
                                 title={isExpanded ? "collapse" : "expand"}
                              >
                                 ▸
                              </button>
                           ) : (
                              <span className="timeline-chev-spacer" />
                           )}
                           <span className={`timeline-kind timeline-kind-${c.kind}`} />
                           <span className="timeline-label-text">{c.label}</span>
                           {hasChildren ? (
                              <button
                                 type="button"
                                 className="timeline-focus-btn"
                                 data-focus-key={c.key}
                                 title="zoom time axis to this timeline"
                              >
                                 ⤢
                              </button>
                           ) : null}
                        </div>
                        <div className="timeline-track">
                           <div
                              className={`timeline-bar timeline-bar-${c.kind}${isSelected ? " is-selected" : ""}`}
                              data-bar-key={c.key}
                              style={{
                                 left: `${leftClipped}%`,
                                 width: `${width}%`,
                                 background: `hsl(${c.hue} 70% 55% / 0.85)`,
                                 borderColor: `hsl(${c.hue} 70% 40%)`,
                              }}
                           />
                           {c.detail.keyframes?.map((kf, i, keyframes) => {
                              if (!kf.hold || i === 0) return null;
                              const prev = keyframes[i - 1];
                              const holdStart = timeToPercent(prev.time);
                              const holdEnd = timeToPercent(kf.time);
                              if (holdEnd < -0.5 || holdStart > 100.5) return null;
                              const leftPct = Math.max(0, Math.min(100, holdStart));
                              const rightPct = Math.max(0, Math.min(100, holdEnd));
                              const spanWidth = Math.max(0.25, rightPct - leftPct);
                              return (
                                 <span
                                    key={`hold-${i}`}
                                    className="timeline-hold-span"
                                    style={{ left: `${leftPct}%`, width: `${spanWidth}%` }}
                                    title={`HOLD · ${prev.time.toFixed(2)}s → ${kf.time.toFixed(2)}s`}
                                 />
                              );
                           })}
                           {c.detail.keyframes?.map((kf, i) => {
                              const pct = timeToPercent(kf.time);
                              if (pct < -0.5 || pct > 100.5) return null;
                              return (
                                 <span
                                    key={i}
                                    className={`timeline-kf-marker${isSelected ? " is-selected" : ""}${kf.hold ? " is-hold" : ""}`}
                                    style={{ left: `${Math.max(0, Math.min(100, pct))}%` }}
                                    title={`${kf.time.toFixed(2)}s${kf.hold ? " · HOLD" : kf.curve ? ` · ${kf.curve}` : ""}`}
                                 />
                              );
                           })}
                        </div>
                     </div>
                  );
               })}

               <div className="timeline-visual-overlay">
                  {snapshot.labels
                     .filter((l) => l.t >= viewStart - 1e-6 && l.t <= viewEnd + 1e-6)
                     .map((l) => (
                        <div key={l.name} className="timeline-marker" style={{ left: `${timeToPercent(l.t)}%` }}>
                           <span>{l.name}</span>
                        </div>
                     ))}
                  <PlayheadMarker progress={progress} totalDur={totalDur} viewStart={viewStart} viewDur={viewDur} />
               </div>
            </div>
         </div>

         {toast ? (
            <div key={toast.key} className="timeline-toast" role="status" aria-live="polite">
               {toast.text}
            </div>
         ) : null}
      </div>
   );
}

function PlayheadMarker({
   progress,
   totalDur,
   viewStart,
   viewDur,
}: {
   progress: number;
   totalDur: number;
   viewStart: number;
   viewDur: number;
}) {
   const abs = progress * totalDur;
   const pct = ((abs - viewStart) / viewDur) * 100;
   if (pct < -0.5 || pct > 100.5) return null;
   return <div className="timeline-playhead" style={{ left: `${Math.max(0, Math.min(100, pct))}%` }} />;
}

function Breadcrumb({ crumbs, onJump }: { crumbs: (TimelineChild | null)[]; onJump: (key: string | null) => void }) {
   if (crumbs.length <= 1) return null;
   return (
      <nav className="timeline-crumbs" aria-label="timeline scope">
         {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            const label = c ? c.label : "root";
            return (
               <span key={c ? c.key : "__root"} className="timeline-crumb-part">
                  {i > 0 ? <span className="timeline-crumb-sep">›</span> : null}
                  {isLast ? (
                     <span className="timeline-crumb is-current">{label}</span>
                  ) : (
                     <button
                        type="button"
                        className="timeline-crumb"
                        onClick={() => onJump(c ? c.key : null)}
                        title={c ? "focus this timeline" : "back to full timeline"}
                     >
                        {label}
                     </button>
                  )}
               </span>
            );
         })}
      </nav>
   );
}

function DetailPanel({
   row,
   currentTime,
   onClose,
   onSeek,
   onFocus,
   onCopyKeyframe,
}: {
   row: TimelineChild;
   currentTime: number;
   onClose: () => void;
   onSeek: (t: number) => void;
   onFocus: () => void;
   onCopyKeyframe?: (i: number) => void;
}) {
   const d = row.detail;
   const end = row.absoluteStart + row.duration;
   const hasChildren = row.children != null && row.children.length > 0;
   return (
      <div className="timeline-detail" style={{ borderLeftColor: `hsl(${row.hue} 70% 55%)` }}>
         <div className="timeline-detail-head">
            <span className="timeline-detail-swatch" style={{ background: `hsl(${row.hue} 70% 55%)` }} />
            <span className="timeline-detail-title">{row.label}</span>
            <span className="timeline-detail-kind">{row.kind}</span>
            <div className="timeline-detail-seek">
               <button onClick={() => onSeek(row.absoluteStart)} title="jump to start">
                  ⇤ start
               </button>
               <button onClick={() => onSeek(end)} title="jump to end">
                  end ⇥
               </button>
               {hasChildren ? (
                  <button onClick={onFocus} title="zoom time axis to this timeline">
                     ⤢ focus
                  </button>
               ) : null}
            </div>
            <button className="timeline-detail-close" onClick={onClose} title="close (esc)">
               ×
            </button>
         </div>
         <div className="timeline-detail-body">
            <Field label="time">
               {row.absoluteStart.toFixed(2)}s → {end.toFixed(2)}s
               <span className="timeline-detail-muted"> · {row.duration.toFixed(2)}s</span>
            </Field>
            {d.ease ? <Field label="ease">{d.ease}</Field> : null}
            {d.stagger ? <Field label="stagger">{d.stagger}</Field> : null}
            {d.repeat ? <Field label="repeat">{d.repeat}</Field> : null}
            {d.isTimeline ? <Field label="children">{d.nestedCount} tweens</Field> : null}
            {d.targets.length > 0 ? (
               <Field label={`targets (${d.targets.length})`}>
                  <span className="timeline-detail-targets">
                     {d.targets.slice(0, 6).map((t, i) => (
                        <code key={i}>{t}</code>
                     ))}
                     {d.targets.length > 6 ? (
                        <span className="timeline-detail-muted">+{d.targets.length - 6} more</span>
                     ) : null}
                  </span>
               </Field>
            ) : null}
            {d.keyframes && d.keyframes.length > 0 ? (
               <Field label={`keyframes (${d.keyframes.length})`}>
                  <KeyframeList
                     keyframes={d.keyframes}
                     currentTime={currentTime}
                     onSeek={onSeek}
                     onCopyKeyframe={onCopyKeyframe}
                  />
               </Field>
            ) : d.props.length > 0 ? (
               <Field label={`props (${d.props.length})`}>
                  <span className="timeline-detail-props">
                     {d.props.map((p) => (
                        <span key={p} className="timeline-detail-prop">
                           <code>{p}</code>
                           <span className="timeline-detail-muted">
                              {": "}
                              {d.propValues[p]}
                           </span>
                        </span>
                     ))}
                  </span>
               </Field>
            ) : null}
         </div>
      </div>
   );
}

function DetailPlaceholder() {
   return (
      <div className="timeline-detail-placeholder">
         <div className="timeline-detail-placeholder-title">no track selected</div>
         <div className="timeline-detail-placeholder-body">
            click a bar in the timeline below to inspect its keyframes. press <kbd>esc</kbd> to clear, <kbd>space</kbd>{" "}
            to play / pause.
         </div>
      </div>
   );
}

// Inline curve preview rendered under a clicked segment row in the
// keyframe inspector. Renders the easing function as an SVG path with
// axes 0..1 (normalized progress on x, eased value on y), and overlays
// a live dot at the playhead's normalized position within the segment
// `[startTime, endTime]`. The dot updates every animation frame because
// `currentTime` is sourced from useTimeline's RAF-driven snapshot.
//
// Click-to-scrub: clicking inside the curve seeks the playhead to the
// time within the segment that corresponds to the clicked x-position.
const CURVE_W = 220;
const CURVE_H = 110;
const CURVE_PAD = 10; // inner padding so the dot near (0,0) or (1,1) doesn't clip
const CURVE_SAMPLES = 96;

type PreviewTransition = PureKeyframeView["transitionData"];
type PreviewHandle = NonNullable<PreviewTransition>["start"] | null;

function previewHandleSpeed(handle: PreviewHandle): number {
   if (handle == null || handle === "auto") return 1;
   if (typeof handle.speed === "number") return handle.speed;
   if (typeof handle.velocity === "number") return handle.velocity;
   return 1;
}

function previewHandleInfluence(handle: PreviewHandle): number {
   if (handle == null || handle === "auto") return 1 / 3;
   return typeof handle.influence === "number" ? handle.influence : 1 / 3;
}

function bezierUnit(u: number, p0: number, p1: number, p2: number, p3: number): number {
   const a = 1 - u;
   return a * a * a * p0 + 3 * a * a * u * p1 + 3 * a * u * u * p2 + u * u * u * p3;
}

function samplePreviewCurve(x: number, transition: PreviewTransition): number {
   if (transition?.jump) return x >= 1 ? 1 : 0;
   const start = transition?.start ?? null;
   const end = transition?.end ?? null;
   const x1 = previewHandleInfluence(start);
   const x2 = 1 - previewHandleInfluence(end);
   const y1 = previewHandleSpeed(start) * x1;
   const y2 = 1 - previewHandleSpeed(end) * (1 - x2);
   let lo = 0;
   let hi = 1;
   for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      if (bezierUnit(mid, 0, x1, x2, 1) < x) lo = mid;
      else hi = mid;
   }
   return bezierUnit((lo + hi) / 2, 0, y1, y2, 1);
}

function EasingCurvePreview({
   curve,
   endKeyframe,
   startTime,
   endTime,
   currentTime,
   onSeek,
}: {
   curve: string | null;
   endKeyframe: PureKeyframeView;
   startTime: number;
   endTime: number;
   currentTime: number;
   onSeek: (t: number) => void;
}) {
   const duration = Math.max(1e-6, endTime - startTime);
   const u = (currentTime - startTime) / duration;
   const inSegment = u >= -1e-6 && u <= 1 + 1e-6;
   const uClamped = Math.max(0, Math.min(1, u));
   const valueAtPlayhead = samplePreviewCurve(uClamped, endKeyframe.transitionData);

   const innerW = CURVE_W - CURVE_PAD * 2;
   const innerH = CURVE_H - CURVE_PAD * 2;

   // Sample the curve. SVG y is top-down but we want value 0 at the
   // bottom of the plot, so flip y as `(1 - v) * innerH`.
   const points = useMemo(() => {
      const pts: string[] = [];
      for (let i = 0; i <= CURVE_SAMPLES; i++) {
         const t = i / CURVE_SAMPLES;
         const v = samplePreviewCurve(t, endKeyframe.transitionData);
         const x = CURVE_PAD + t * innerW;
         const y = CURVE_PAD + (1 - v) * innerH;
         pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }
      return pts.join(" ");
   }, [endKeyframe.transitionData, innerW, innerH]);

   const dotX = CURVE_PAD + uClamped * innerW;
   const dotY = CURVE_PAD + (1 - valueAtPlayhead) * innerH;

   const localTime = currentTime - startTime;

   const handleScrub = useCallback(
      (e: ReactMouseEvent<SVGSVGElement>) => {
         const rect = e.currentTarget.getBoundingClientRect();
         const x = e.clientX - rect.left;
         const xNorm = (x - CURVE_PAD) / innerW;
         const clamped = Math.max(0, Math.min(1, xNorm));
         onSeek(startTime + clamped * duration);
      },
      [innerW, onSeek, startTime, duration],
   );

   return (
      <div className="timeline-keyframe-curve">
         <svg
            className="timeline-keyframe-curve-svg"
            width={CURVE_W}
            height={CURVE_H}
            viewBox={`0 0 ${CURVE_W} ${CURVE_H}`}
            onClick={handleScrub}
            role="img"
            aria-label={`Bezier curve ${curve ?? "linear"}, click to scrub`}
         >
            {/* plot frame */}
            <rect
               className="timeline-keyframe-curve-frame"
               x={CURVE_PAD}
               y={CURVE_PAD}
               width={innerW}
               height={innerH}
               rx={2}
            />
            {/* gridlines at quarters — light visual reference */}
            {[0.25, 0.5, 0.75].map((g) => (
               <Fragment key={g}>
                  <line
                     className="timeline-keyframe-curve-grid"
                     x1={CURVE_PAD + g * innerW}
                     x2={CURVE_PAD + g * innerW}
                     y1={CURVE_PAD}
                     y2={CURVE_PAD + innerH}
                  />
                  <line
                     className="timeline-keyframe-curve-grid"
                     x1={CURVE_PAD}
                     x2={CURVE_PAD + innerW}
                     y1={CURVE_PAD + g * innerH}
                     y2={CURVE_PAD + g * innerH}
                  />
               </Fragment>
            ))}
            {/* identity reference (linear) for comparison */}
            <line
               className="timeline-keyframe-curve-identity"
               x1={CURVE_PAD}
               y1={CURVE_PAD + innerH}
               x2={CURVE_PAD + innerW}
               y2={CURVE_PAD}
            />
            {/* the actual curve */}
            <polyline className="timeline-keyframe-curve-line" points={points} />
            {/* crosshair from dot down to t-axis and across to v-axis */}
            {inSegment ? (
               <>
                  <line
                     className="timeline-keyframe-curve-crosshair"
                     x1={dotX}
                     x2={dotX}
                     y1={dotY}
                     y2={CURVE_PAD + innerH}
                  />
                  <line className="timeline-keyframe-curve-crosshair" x1={CURVE_PAD} x2={dotX} y1={dotY} y2={dotY} />
                  <circle className="timeline-keyframe-curve-dot" cx={dotX} cy={dotY} r={4} />
               </>
            ) : null}
         </svg>
         <div className="timeline-keyframe-curve-readout">
            <div>
               <span className="timeline-detail-muted">curve</span>
               <code>{curve ?? "linear"}</code>
            </div>
            <div>
               <span className="timeline-detail-muted">t</span>
               <code>
                  {inSegment ? `${localTime.toFixed(2)}s / ${duration.toFixed(2)}s` : `outside ${duration.toFixed(2)}s`}
               </code>
            </div>
            <div>
               <span className="timeline-detail-muted">u</span>
               <code>{inSegment ? uClamped.toFixed(3) : "—"}</code>
            </div>
            <div>
               <span className="timeline-detail-muted">value</span>
               <code>{inSegment ? valueAtPlayhead.toFixed(3) : "—"}</code>
            </div>
         </div>
      </div>
   );
}

function KeyframeList({
   keyframes,
   currentTime,
   onSeek,
   onCopyKeyframe,
}: {
   keyframes: PureKeyframeView[];
   currentTime: number;
   onSeek: (t: number) => void;
   onCopyKeyframe?: (i: number) => void;
}) {
   const containerRef = useRef<HTMLDivElement>(null);
   const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
   const draggingRef = useRef(false);
   const [centers, setCenters] = useState<number[]>([]);
   // Two independent expand states: keyframe rows show their `state` props,
   // segment rows show the easing-curve graph for the segment between
   // keyframe i and i+1. Both reset when the user picks a different track.
   const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
   const [expandedSegments, setExpandedSegments] = useState<Set<number>>(() => new Set());
   useEffect(() => {
      setExpanded(new Set());
      setExpandedSegments(new Set());
   }, [keyframes]);
   const toggleExpanded = useCallback((i: number) => {
      setExpanded((prev) => {
         const next = new Set(prev);
         if (next.has(i)) next.delete(i);
         else next.add(i);
         return next;
      });
   }, []);
   const toggleSegment = useCallback((i: number) => {
      setExpandedSegments((prev) => {
         const next = new Set(prev);
         if (next.has(i)) next.delete(i);
         else next.add(i);
         return next;
      });
   }, []);

   // Measure each row's vertical center relative to the container so the
   // playhead anchors to the actual rendered row positions instead of a flat
   // time-proportional mapping (which mis-aligns when row heights vary).
   useLayoutEffect(() => {
      const c = containerRef.current;
      if (!c) return;
      const measure = () => {
         const containerRect = c.getBoundingClientRect();
         const next: number[] = [];
         for (let i = 0; i < keyframes.length; i++) {
            const row = rowRefs.current[i];
            if (!row) {
               next.push(0);
               continue;
            }
            const r = row.getBoundingClientRect();
            next.push(r.top + r.height / 2 - containerRect.top);
         }
         setCenters((prev) => {
            if (prev.length === next.length && prev.every((v, i) => Math.abs(v - next[i]) < 0.5)) return prev;
            return next;
         });
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(c);
      rowRefs.current.forEach((row) => row && ro.observe(row));
      return () => ro.disconnect();
   }, [keyframes.length, expanded]);

   // Find the keyframe interval bracketing `t` and lerp into [0, 1] within it.
   const findInterval = useCallback(
      (t: number): { i: number; frac: number } => {
         if (keyframes.length === 0) return { i: 0, frac: 0 };
         if (t <= keyframes[0].time) return { i: 0, frac: 0 };
         if (t >= keyframes[keyframes.length - 1].time) return { i: keyframes.length - 1, frac: 0 };
         for (let i = 0; i < keyframes.length - 1; i++) {
            const a = keyframes[i].time;
            const b = keyframes[i + 1].time;
            if (t >= a && t <= b) {
               const frac = (t - a) / Math.max(1e-6, b - a);
               return { i, frac };
            }
         }
         return { i: keyframes.length - 1, frac: 0 };
      },
      [keyframes],
   );

   const ready = centers.length === keyframes.length && keyframes.length > 0;

   // y position (in container px) for the playhead, lerping between row centers.
   let playheadY = 0;
   let inRange = false;
   if (ready) {
      const firstT = keyframes[0].time;
      const lastT = keyframes[keyframes.length - 1].time;
      inRange = currentTime >= firstT - 1e-6 && currentTime <= lastT + 1e-6;
      const { i, frac } = findInterval(currentTime);
      const a = centers[i];
      const b = centers[Math.min(i + 1, centers.length - 1)];
      playheadY = a + frac * (b - a);
   }

   // Inverse: client-y → time, by finding the row centers that bracket the
   // pointer and lerping back into the matching keyframe interval. Acceptable
   // side-effect: scrub velocity is non-uniform across keyframes (a long time
   // gap between two keyframes feels "fast", a short gap feels "slow"). This
   // is fine — every row gets the same vertical real-estate.
   const scrubFromClientY = useCallback(
      (clientY: number) => {
         const c = containerRef.current;
         if (!c || !ready) return;
         const r = c.getBoundingClientRect();
         const y = clientY - r.top;
         if (y <= centers[0]) {
            onSeek(keyframes[0].time);
            return;
         }
         const lastIdx = centers.length - 1;
         if (y >= centers[lastIdx]) {
            onSeek(keyframes[lastIdx].time);
            return;
         }
         for (let i = 0; i < lastIdx; i++) {
            if (y >= centers[i] && y <= centers[i + 1]) {
               const frac = (y - centers[i]) / Math.max(1e-6, centers[i + 1] - centers[i]);
               const t = keyframes[i].time + frac * (keyframes[i + 1].time - keyframes[i].time);
               onSeek(t);
               return;
            }
         }
      },
      [centers, keyframes, onSeek, ready],
   );

   return (
      <div className="timeline-keyframes" ref={containerRef}>
         <div
            className="timeline-keyframes-gutter"
            title="drag to scrub"
            onPointerDown={(e) => {
               if (!ready) return;
               draggingRef.current = true;
               (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
               scrubFromClientY(e.clientY);
            }}
            onPointerMove={(e) => {
               if (!draggingRef.current) return;
               scrubFromClientY(e.clientY);
            }}
            onPointerUp={(e) => {
               draggingRef.current = false;
               try {
                  (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
               } catch {
                  /* ignore */
               }
            }}
            onPointerCancel={() => {
               draggingRef.current = false;
            }}
         />
         {ready ? (
            <div
               className={`timeline-keyframes-playhead${inRange ? "" : " is-outside"}`}
               style={{ top: `${playheadY}px` }}
               aria-hidden="true"
            />
         ) : null}
         {keyframes.map((k, i) => {
            const entries = Object.entries(k.state);
            const isExpanded = expanded.has(i);
            const hasNextKf = i < keyframes.length - 1;
            const nextKf = hasNextKf ? keyframes[i + 1] : null;
            const isHoldSegment = Boolean(nextKf?.hold);
            const segCurve = nextKf ? (nextKf.curve ?? "linear") : null;
            const segLabel = isHoldSegment ? "HOLD" : segCurve;
            const isSegExpanded = expandedSegments.has(i);
            return (
               <Fragment key={i}>
                  <div
                     ref={(el) => {
                        rowRefs.current[i] = el;
                     }}
                     className={`timeline-keyframe${isExpanded ? " is-expanded" : ""}`}
                     onContextMenu={(e) => {
                        if (!onCopyKeyframe) return;
                        e.preventDefault();
                        onCopyKeyframe(i);
                     }}
                  >
                     <button
                        type="button"
                        className="timeline-keyframe-time"
                        onClick={() => onSeek(k.time)}
                        title={`jump to ${k.time.toFixed(2)}s — right-click row to copy a blurb`}
                     >
                        {k.time.toFixed(2)}s
                     </button>
                     <span className="timeline-keyframe-line" aria-hidden="true" />
                     <button
                        type="button"
                        className="timeline-keyframe-expand"
                        onClick={() => toggleExpanded(i)}
                        aria-pressed={isExpanded}
                        aria-label={isExpanded ? "collapse state" : "expand state"}
                        title={isExpanded ? "collapse state" : "expand state"}
                     >
                        ▸
                     </button>
                  </div>
                  {isExpanded ? (
                     <div className="timeline-keyframe-detail-card">
                        {entries.length === 0 ? (
                           <span className="timeline-detail-muted">∅ no state</span>
                        ) : (
                           entries.map(([prop, value]) => (
                              <span key={prop} className="timeline-keyframe-prop">
                                 <code>{prop}</code>
                                 <span className="timeline-detail-muted">{value}</span>
                              </span>
                           ))
                        )}
                     </div>
                  ) : null}
                  {nextKf && segLabel != null ? (
                     <button
                        type="button"
                        className={`timeline-keyframe-segment${segCurve === "linear" ? " is-linear" : ""}${
                           isHoldSegment ? " is-hold" : ""
                        }${isSegExpanded ? " is-expanded" : ""}`}
                        aria-pressed={isSegExpanded}
                        aria-label={isSegExpanded ? "hide segment detail" : "show segment detail"}
                        title={
                           isSegExpanded
                              ? `hide segment detail · ${segLabel}`
                              : `show ${isHoldSegment ? "hold" : "curve"} · ${segLabel} · ${k.time.toFixed(2)}s → ${nextKf.time.toFixed(2)}s`
                        }
                        onClick={() => toggleSegment(i)}
                     >
                        <span className="timeline-keyframe-segment-ease">{segLabel}</span>
                        <span className="timeline-keyframe-segment-meta">Δ {(nextKf.time - k.time).toFixed(2)}s</span>
                        <span className="timeline-keyframe-segment-chevron" aria-hidden="true">
                           {isSegExpanded ? "▾" : "▸"}
                        </span>
                     </button>
                  ) : null}
                  {nextKf && isSegExpanded && isHoldSegment ? (
                     <div className="timeline-keyframe-hold-card">
                        <span className="timeline-keyframe-hold-badge">HOLD</span>
                        <span>No property changes during this segment.</span>
                     </div>
                  ) : null}
                  {nextKf && isSegExpanded && !isHoldSegment ? (
                     <EasingCurvePreview
                        curve={segCurve}
                        endKeyframe={nextKf}
                        startTime={k.time}
                        endTime={nextKf.time}
                        currentTime={currentTime}
                        onSeek={onSeek}
                     />
                  ) : null}
               </Fragment>
            );
         })}
      </div>
   );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
   return (
      <div className="timeline-detail-field">
         <span className="timeline-detail-label">{label}</span>
         <span className="timeline-detail-value">{children}</span>
      </div>
   );
}

// Silence an otherwise unused type import.
export type { TimelineSnapshot };
