import type { CSSProperties, Ref } from "react";
import { FONT_SANS, PALETTE } from "./beats";

// Small uppercase tag used above each scene's headline. Always the same
// shape so the eye reads "this is the section label" instantly across
// every scene. Caller passes its own ref through `innerRef` so the
// parent scene can animate the entry.

type Props = {
   children: React.ReactNode;
   innerRef?: Ref<HTMLDivElement>;
   style?: CSSProperties;
};

export function Eyebrow({ children, innerRef, style }: Props) {
   return (
      <div
         ref={innerRef}
         className="inline-flex items-center"
         style={{
            gap: 10,
            paddingInline: 14,
            paddingBlock: 7,
            borderRadius: 999,
            background: "rgba(232, 155, 44, 0.10)",
            border: `1px solid rgba(232, 155, 44, 0.28)`,
            color: PALETTE.amber,
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            ...style,
         }}
      >
         <span
            style={{
               display: "inline-block",
               width: 6,
               height: 6,
               borderRadius: "50%",
               background: PALETTE.amber,
               boxShadow: `0 0 0 4px rgba(232, 155, 44, 0.16)`,
            }}
         />
         {children}
      </div>
   );
}
