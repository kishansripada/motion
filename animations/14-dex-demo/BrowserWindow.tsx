import type { ReactNode } from "react";

type Props = {
   url: string;
   width: number;
   height: number;
   children: ReactNode;
};

export const BROWSER_TITLE_H = 22;

// macOS-style chrome window. Stripped to the essentials: traffic-light dots
// on the left, a faint URL pill in the centre, and content that fills the rest.
export function BrowserWindow({ url, width, height, children }: Props) {
   return (
      <div
         style={{
            width,
            height,
            borderRadius: 14,
            overflow: "hidden",
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: [
               "0 50px 100px -20px rgba(28,40,80,0.28)",
               "0 28px 56px -22px rgba(0,0,0,0.42)",
               "0 4px 10px -4px rgba(0,0,0,0.18)",
            ].join(", "),
         }}
      >
         <div
            className="relative flex items-center"
            style={{
               height: BROWSER_TITLE_H,
               background: "linear-gradient(180deg, #f1f1f1 0%, #d9d9d9 100%)",
               borderBottom: "1px solid rgba(0,0,0,0.10)",
               paddingLeft: 10,
               paddingRight: 10,
            }}
         >
            <div className="flex" style={{ gap: 5 }}>
               <TrafficDot color="#ff5f57" />
               <TrafficDot color="#febc2e" />
               <TrafficDot color="#28c840" />
            </div>

            <div
               className="pointer-events-none absolute left-1/2 -translate-x-1/2"
               style={{
                  background: "rgba(255,255,255,0.85)",
                  borderRadius: 4,
                  paddingInline: 7,
                  paddingBlock: 1,
                  fontSize: 9,
                  lineHeight: "12px",
                  color: "rgba(0,0,0,0.55)",
                  fontFamily:
                     '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  letterSpacing: "0.005em",
                  whiteSpace: "nowrap",
                  maxWidth: width * 0.55,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  border: "1px solid rgba(0,0,0,0.08)",
               }}
            >
               {url}
            </div>
         </div>

         <div
            style={{
               width,
               height: height - BROWSER_TITLE_H,
               overflow: "hidden",
               background: "#ffffff",
            }}
         >
            {children}
         </div>
      </div>
   );
}

function TrafficDot({ color }: { color: string }) {
   return (
      <span
         style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: color,
            boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.18)",
         }}
      />
   );
}
