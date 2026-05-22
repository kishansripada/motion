import type { CSSProperties } from "react";
import { BrowserWindow, BROWSER_TITLE_H } from "./BrowserWindow";

type Props = {
   src: string;
   url: string;
   width: number;
   height: number;
   imageObjectPosition?: CSSProperties["objectPosition"];
};

// Sales-tool screenshot inside the shared chrome window. Big drop shadow +
// 1px border come from BrowserWindow so every product/browser beat uses the
// same visual language.
//
// imageObjectPosition: defaults to "top center" so the captured hero text
// stays visible when the 1440×900 source is squeezed into a smaller
// content area; pass a different value if a particular window has its
// hero offset.
export function SalesWindow({ src, url, width, height, imageObjectPosition = "top center" }: Props) {
   return (
      <BrowserWindow url={url} width={width} height={height}>
         <div
            style={{
               width,
               height: height - BROWSER_TITLE_H,
               overflow: "hidden",
               background: "#ffffff",
            }}
         >
            <img
               src={src}
               alt=""
               draggable={false}
               className="block select-none"
               style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: imageObjectPosition,
               }}
            />
         </div>
      </BrowserWindow>
   );
}
