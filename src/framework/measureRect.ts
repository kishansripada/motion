/**
 * Read an element's viewport-relative rectangle, plus a few computed
 * conveniences (`right`, `bottom`, `cx`, `cy`).
 *
 * The returned object is frozen so callers don't accidentally mutate
 * a measurement and reuse it as a "live" handle. Re-measure if you
 * need fresh values.
 *
 * # Strict mode
 *
 * `strict: true` walks the ancestor chain and throws if any ancestor
 * is currently carrying a transient transform. This catches what we
 * call **measurement-time coordinate drift** — the bug where:
 *
 *   1. an ancestor is given an inline `transform` (e.g. `translateY(14px)`)
 *      to "hide" or "shift" it during a setup step,
 *   2. an interior element is measured (its bounding rect now includes
 *      the ancestor's transform),
 *   3. an animation later docks the interior element back into flow at
 *      the measured coords,
 *   4. but by settle time the ancestor's transform has been removed,
 *      so the dock target is off by exactly the ancestor delta.
 *
 * The result is a hard-to-spot one-frame snap at the end of the dock.
 * In strict mode we refuse to measure under those conditions and force
 * the author to either remove the ancestor transform first, or pass a
 * function-target to `flyBetween` so the dock re-measures fresh.
 *
 * Strict mode considers an ancestor "drifted" if any of these are
 * non-identity:
 *   • inline `style.transform` (anything other than "" or "none")
 *   • inline `style.translate` / `style.scale` / `style.rotate`
 *   • computed `transform` matrix that is not the identity AND that
 *     comes from inline style rather than a stylesheet (so a
 *     stylesheet-applied `transform: scale(1.02)` on a hover state
 *     wouldn't false-positive — only transient inline writes do).
 *
 * Most authors use the non-strict default. Library code (notably
 * `liftAndPark`) flips strict on after portaling to a known-safe host,
 * so the assertion guards the boundary between "we control this
 * subtree" and "we don't".
 */

export interface Rect {
   readonly top: number;
   readonly left: number;
   readonly width: number;
   readonly height: number;
   readonly right: number;
   readonly bottom: number;
   readonly cx: number;
   readonly cy: number;
}

export interface MeasureOptions {
   /**
    * If true, throw when any ancestor up to (but not including) the
    * document's `<html>` carries a transient inline transform. See file
    * header for the rationale. Default: false.
    */
   strict?: boolean;
   /**
    * In strict mode, stop walking the ancestor chain once we reach
    * this element. Useful when you're operating inside a known-safe
    * subtree (e.g. you just portaled `el` into `host` — you trust
    * `host` and everything above it is irrelevant). Defaults to the
    * document root.
    */
   stopAt?: Element | null;
}

export function measureRect(el: Element, opts: MeasureOptions = {}): Rect {
   if (opts.strict) {
      assertNoAncestorTransform(el, opts.stopAt ?? null);
   }
   const r = el.getBoundingClientRect();
   return Object.freeze({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      right: r.right,
      bottom: r.bottom,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
   });
}

function assertNoAncestorTransform(el: Element, stopAt: Element | null): void {
   const win = el.ownerDocument?.defaultView ?? window;
   let cur: Element | null = el.parentElement;
   while (cur && cur !== stopAt && cur !== el.ownerDocument?.documentElement) {
      const drift = describeInlineTransformDrift(cur, win);
      if (drift) {
         const tag = describeElement(cur);
         throw new Error(
            `[measureRect] strict: ancestor ${tag} has a transient inline transform (${drift}). ` +
               `This will poison the measurement — the rect will include the transform, ` +
               `but flow position at settle won't. Either clear the inline transform before ` +
               `measuring, or use flyBetween(tl, pin, () => measureRect(el), ...) so the dock ` +
               `target is re-measured at tween start.`,
         );
      }
      cur = cur.parentElement;
   }
}

/**
 * Returns a human-readable string describing the *inline* (non-stylesheet)
 * transform on `el` if any, or null if the element is identity-at-rest.
 *
 * We deliberately ignore stylesheet-applied transforms — those are part
 * of the design and are stable across the build/dock window. Only inline
 * writes are transient enough to cause drift.
 */
function isIdentityTransform(transform: string): boolean {
   const t = transform.trim();
   if (!t || t === "none") return true;
   try {
      const matrix = new DOMMatrixReadOnly(t);
      return matrix.isIdentity;
   } catch {
      return false;
   }
}

function describeInlineTransformDrift(el: Element, _win: Window): string | null {
   const style = (el as HTMLElement).style;
   if (!style) return null;
   const t = style.transform?.trim();
   if (t && !isIdentityTransform(t)) return `style.transform="${t}"`;
   const tr = (style as CSSStyleDeclaration & { translate?: string }).translate?.trim();
   if (tr && tr !== "none" && tr !== "0px" && tr !== "0px 0px") return `style.translate="${tr}"`;
   const sc = (style as CSSStyleDeclaration & { scale?: string }).scale?.trim();
   if (sc && sc !== "none" && sc !== "1" && sc !== "1 1") return `style.scale="${sc}"`;
   const ro = (style as CSSStyleDeclaration & { rotate?: string }).rotate?.trim();
   if (ro && ro !== "none" && ro !== "0deg" && ro !== "0") return `style.rotate="${ro}"`;
   return null;
}

function describeElement(el: Element): string {
   const tag = el.tagName.toLowerCase();
   const id = el.id ? `#${el.id}` : "";
   const cls =
      typeof (el as HTMLElement).className === "string" && (el as HTMLElement).className
         ? "." + (el as HTMLElement).className.trim().split(/\s+/).slice(0, 2).join(".")
         : "";
   return `<${tag}${id}${cls}>`;
}
