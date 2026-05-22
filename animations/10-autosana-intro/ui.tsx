import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../src/framework";

function target(name?: string): { "data-motion"?: string } {
   return name ? { "data-motion": name } : {};
}

export type DashedRailProps = HTMLAttributes<HTMLDivElement> & {
   side?: "left" | "right";
};

export function DashedRail({ side = "left", className, ...props }: DashedRailProps) {
   return (
      <div
         aria-hidden="true"
         className={cn(
            "pointer-events-none fixed top-0 bottom-0 z-0 w-0 border-l border-dashed border-motion-border-soft",
            side === "left" ? "left-36" : "right-36",
            className,
         )}
         {...props}
      />
   );
}

export type MessageBubbleProps = HTMLAttributes<HTMLDivElement> & {
   ref?: Ref<HTMLDivElement>;
   motionName?: string;
   textMotionName?: string;
   align?: "start" | "end";
   children: ReactNode;
   textRef?: Ref<HTMLSpanElement>;
};

export function MessageBubble({
   ref,
   motionName,
   textMotionName,
   textRef,
   align = "end",
   className,
   children,
   ...props
}: MessageBubbleProps) {
   return (
      <div
         ref={ref}
         className={cn(
            "max-w-full border border-dashed border-motion-border bg-white/1.5 px-[18px] py-3.5 text-base leading-6 text-motion-foreground opacity-0 will-change-transform",
            align === "end" ? "self-end" : "self-start",
            className,
         )}
         {...target(motionName)}
         {...props}
      >
         <span ref={textRef} className="whitespace-pre-wrap" {...target(textMotionName)}>
            {children}
         </span>
      </div>
   );
}

export type AgentMessageProps = HTMLAttributes<HTMLDivElement> & {
   ref?: Ref<HTMLDivElement>;
   motionName?: string;
   textMotionName?: string;
   attributionMotionName?: string;
   name: string;
   avatar?: ReactNode;
   children: ReactNode;
   textRef?: Ref<HTMLSpanElement>;
};

export function AgentMessage({
   ref,
   motionName,
   textMotionName,
   attributionMotionName,
   textRef,
   name,
   avatar,
   className,
   children,
   ...props
}: AgentMessageProps) {
   return (
      <div
         ref={ref}
         className={cn(
            "flex max-w-full flex-col items-start gap-2 self-start opacity-0 will-change-transform",
            className,
         )}
         {...target(motionName)}
         {...props}
      >
         <div className="flex items-center gap-2 pl-1" {...target(attributionMotionName)}>
            {avatar ?? <span className="size-[18px] shrink-0 bg-white" aria-hidden="true" />}
            <span className="text-[13px] font-medium tracking-tight text-motion-foreground">{name}</span>
         </div>
         <div className="border border-dashed border-motion-border bg-white/1.5 px-[18px] py-3.5 text-base leading-6 text-motion-foreground">
            <span ref={textRef} className="whitespace-pre-wrap" {...target(textMotionName)}>
               {children}
            </span>
         </div>
      </div>
   );
}

export type MobileFrameProps = HTMLAttributes<HTMLDivElement> & {
   ref?: Ref<HTMLDivElement>;
   motionName?: string;
   width?: number;
   height?: number;
};

export function MobileFrame({
   ref,
   motionName,
   width = 300,
   height = 600,
   className,
   children,
   style,
   ...props
}: MobileFrameProps) {
   return (
      <div
         ref={ref}
         className={cn(
            "relative shrink-0 overflow-hidden rounded-[36px] border border-white/15 bg-[#0a0a0a] p-[6px] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.65)] will-change-transform",
            className,
         )}
         style={{ width, height, ...style }}
         {...target(motionName)}
         {...props}
      >
         <div
            aria-hidden="true"
            className="absolute top-0 left-1/2 z-20 h-6 w-24 -translate-x-1/2 rounded-b-[14px] bg-[#0a0a0a]"
         />
         <div className="relative h-full w-full overflow-hidden rounded-[30px] bg-white">{children}</div>
      </div>
   );
}

export type PointerProps = HTMLAttributes<HTMLDivElement> & {
   ref?: Ref<HTMLDivElement>;
   motionName?: string;
   size?: number;
   label?: string;
};

const POINTER_PATH =
   "M-11.128,-9.655 C-11.493,-11.541 -9.394,-12.926 -7.803,-11.849 " +
   "C-7.803,-11.849 9.904,0.145 9.904,0.145 " +
   "C11.493,1.221 10.988,3.681 9.104,4.046 " +
   "C9.104,4.046 0.837,5.646 0.837,5.646 " +
   "C0.725,5.668 0.624,5.728 0.555,5.818 " +
   "C0.555,5.818 -3.340,11.370 -3.340,11.370 " +
   "C-4.432,12.926 -6.860,12.407 -7.221,10.540 " +
   "C-7.221,10.540 -11.128,-9.655 -11.128,-9.655 Z";

export function Pointer({ ref, motionName, size = 36, label, className, style, ...props }: PointerProps) {
   return (
      <div
         ref={ref}
         className={cn(
            "pointer-events-none absolute top-0 left-0 z-30 will-change-transform drop-shadow-[0_3px_5px_rgba(0,0,0,0.25)]",
            className,
         )}
         style={{ width: size, height: size, transformOrigin: "14% 18%", ...style }}
         {...target(motionName)}
         {...props}
      >
         <svg viewBox="-15 -15 30 30" preserveAspectRatio="xMinYMin meet" width={size} height={size}>
            <path d={POINTER_PATH} fill="#111" />
            <path
               d={POINTER_PATH}
               fill="none"
               stroke="rgb(253,253,254)"
               strokeWidth="1.687"
               strokeLinejoin="miter"
               strokeMiterlimit={4}
            />
         </svg>
         {label ? (
            <span className="absolute top-[24px] left-[28px] inline-flex items-center whitespace-nowrap rounded-full bg-black/95 px-3 py-1 text-[11px] font-medium tracking-[0.04em] text-white shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
               {label}
            </span>
         ) : null}
      </div>
   );
}

export type AgentComposerProps = HTMLAttributes<HTMLDivElement> & {
   ref?: Ref<HTMLDivElement>;
   motionName?: string;
   typedMotionName?: string;
   cursorMotionName?: string;
   sendMotionName?: string;
   typedRef?: Ref<HTMLSpanElement>;
   cursorRef?: Ref<HTMLSpanElement>;
   sendRef?: Ref<HTMLSpanElement>;
   hint?: string;
   agentLabel?: string;
   modelLabel?: string;
};

export function AgentComposer({
   ref,
   motionName,
   typedMotionName,
   cursorMotionName,
   sendMotionName,
   typedRef,
   cursorRef,
   sendRef,
   hint = "Plan, Build, / for commands, @ for context",
   agentLabel = "Agent",
   modelLabel = "Opus 4.7",
   className,
   ...props
}: AgentComposerProps) {
   return (
      <div
         ref={ref}
         className={cn(
            "relative flex min-h-[156px] flex-col justify-between border border-dashed border-motion-border bg-motion-surface px-5 pt-5 pb-3.5 will-change-[border-color]",
            className,
         )}
         {...target(motionName)}
         {...props}
      >
         <div className="min-h-16 text-base leading-6 text-motion-foreground">
            <span ref={typedRef} className="whitespace-pre-wrap" {...target(typedMotionName)} />
            <span
               ref={cursorRef}
               className="ml-px inline-block h-[1.05em] w-0.5 translate-y-0.5 animate-[aut-blink_1.05s_steps(1,end)_infinite] bg-motion-foreground align-text-bottom"
               {...target(cursorMotionName)}
            />
         </div>

         <div className="mt-3 flex items-center justify-between text-xs text-motion-muted">
            <span className="tracking-[0.005em]">{hint}</span>
            <div className="flex items-center gap-2.5">
               <span className="inline-flex items-center border border-dashed border-motion-border px-2.5 py-0.5 text-[11px] font-medium text-motion-foreground/80">
                  {agentLabel}
               </span>
               <span className="text-[11px] font-medium tracking-[0.01em] text-motion-muted">{modelLabel}</span>
               <span
                  ref={sendRef}
                  className="inline-flex size-[26px] items-center justify-center bg-motion-surface-strong text-motion-foreground/65 will-change-transform"
                  {...target(sendMotionName)}
               >
                  <svg
                     viewBox="0 0 24 24"
                     width="14"
                     height="14"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="2"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                  >
                     <path d="M5 12h14" />
                     <path d="m12 5 7 7-7 7" />
                  </svg>
               </span>
            </div>
         </div>
      </div>
   );
}
