import { cn } from "../../src/framework";

// Story copy. Shared because beats.ts derives typing duration from PROMPT/FIX_PROMPT
// length, animation.tsx renders REPLY in the singleton traveling text, and the
// chat/github/fix scenes display the same lines.
export const PROMPT = "use autosana to test the checkout flow on iOS";
export const REPLY = "Found a bug — the Pay button on iOS hangs after tap. Confirmation never loads.";
export const FIX_PROMPT = "cursor can you fix the bug that autosana found";

// Typing speeds. Used by both the scenes that type and beats.ts which uses them
// to compute submit/typing-complete moments.
export const SEC_PER_CHAR = 0.04;
export const FIX_SEC_PER_CHAR = 0.032;

// Composer pacing — the chat scene types into the composer, then waits before
// the agent fires. beats.ts uses both to derive the submit moment.
export const COLD_OPEN_HOLD = 0.55;
export const HOLD_BEFORE_SUBMIT = 0.45;

// Phone overlay dimensions and entry pose. Used by the chat checkout demo and
// the fix-scene retest replay.
export const PHONE_W = 300;
export const PHONE_H = 600;
export const PHONE_ENTER_Y = 80;
export const PHONE_ENTER_SCALE = 0.92;

// Pointer choreography positions. The same pointer poses are reused by the chat
// checkout demo and the fix-scene retest replay.
export const POINTER_ENTRY = { x: 360, y: 200 } as const;
export const POINTER_INTRO = { x: 220, y: 220 } as const;
export const POINTER_BTN = { x: 138, y: 528 } as const;
export const POINTER_RECOIL = { x: 188, y: 472 } as const;

// Reply text font sizes. Both the chat slot and the github slot need to know
// these so the shared traveling text can flight between them at matching scale.
export const CHAT_TEXT_SIZE = 16;
export const GITHUB_TEXT_SIZE = 22;

// Tiny shared display primitives reused by chat-side and fix-side phone screens.
export function ScreenHeader({ title }: { title: string }) {
   return (
      <header className="border-b border-black/10 text-black">
         <div className="flex h-7 items-center justify-between px-6">
            <span className="text-[12px] font-semibold tracking-tight">9:41</span>
            <span className="text-[15px] leading-none">×</span>
         </div>
         <div className="flex items-center justify-center pt-4 pb-3">
            <span className="text-[14px] font-semibold tracking-tight">{title}</span>
         </div>
      </header>
   );
}

export function Field({ label, value, className }: { label: string; value: string; className?: string }) {
   return (
      <div className={cn("flex flex-col gap-1", className)}>
         <span className="text-[10px] font-medium tracking-wider text-black/40 uppercase">{label}</span>
         <span className="border-b border-black/15 pb-2 text-[13px] text-black">{value}</span>
      </div>
   );
}
