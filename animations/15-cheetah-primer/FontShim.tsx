// Pull in the editorial display serif (Fraunces) used by every hero line
// in this animation. React 19 hoists <link> elements rendered inside the
// component tree into <head> automatically, so a single placement at the
// root is enough for the iframe to fetch the file.
//
// We pre-load only the weights we actually use (400/500/600/700) at small
// optical size to keep the request light. `preconnect` to fonts.gstatic
// cuts the TLS round-trip before the actual font payload request.

export function FontShim() {
   return (
      <>
         <link rel="preconnect" href="https://fonts.googleapis.com" />
         <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
         <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
         />
      </>
   );
}
