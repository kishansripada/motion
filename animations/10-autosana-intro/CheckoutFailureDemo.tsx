import * as React from "react";
import {
   at,
   hold,
   cn,
   curve,
   useMotion,
   useMotionBinding,
} from "../../src/framework";
import { buttonFlash, click } from "./actions";
import { demoBeats } from "./beats";
import {
   Field,
   PHONE_ENTER_SCALE,
   PHONE_ENTER_Y,
   PHONE_H,
   PHONE_W,
   POINTER_BTN,
   POINTER_ENTRY,
   POINTER_INTRO,
   POINTER_RECOIL,
   ScreenHeader,
} from "./shared";
import { MobileFrame, Pointer } from "./ui";

const PHONE_EXIT_Y = -40;
const PHONE_EXIT_SCALE = 0.94;

export function CheckoutFailureDemo() {
   const phone = useMotionBinding<HTMLDivElement>();
   const pointer = useMotionBinding<HTMLDivElement>();
   const screenCart = useMotionBinding<HTMLDivElement>();
   const screenShipping = useMotionBinding<HTMLDivElement>();
   const screenPayment = useMotionBinding<HTMLDivElement>();
   const btnCheckout = useMotionBinding<HTMLButtonElement>();
   const btnContinue = useMotionBinding<HTMLButtonElement>();
   const btnPay = useMotionBinding<HTMLButtonElement>();
   const errorBanner = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = scene.start;

      scene.animate("phone replay enters and exits", phone, [
         at(t + 0, { opacity: 0, y: PHONE_ENTER_Y, scale: PHONE_ENTER_SCALE }),
         at(t + 0.55, { opacity: 1, y: 0, scale: 1 }, curve.backOut(1.3)),
         hold(t + demoBeats.exit),
         at(t + demoBeats.exit + 0.45, { opacity: 0, y: PHONE_EXIT_Y, scale: PHONE_EXIT_SCALE }, curve.in(2)),
      ]);

      scene.animate("Autosana pointer clicks through checkout and recoils", pointer, [
         at(t + 0, { opacity: 0, x: POINTER_ENTRY.x, y: POINTER_ENTRY.y, scale: 1 }),
         at(t + 0.3, { opacity: 1, x: POINTER_INTRO.x, y: POINTER_INTRO.y, scale: 1 }, curve.out(2)),
         at(t + 0.95, { opacity: 1, x: POINTER_BTN.x, y: POINTER_BTN.y, scale: 1 }, curve.inOut(2)),
         ...click(t + demoBeats.click1, { x: POINTER_BTN.x, y: POINTER_BTN.y, drift: { dx: 14, dy: -12 } }),
         ...click(t + demoBeats.click2, { x: POINTER_BTN.x, y: POINTER_BTN.y, drift: { dx: -24, dy: -18 } }),
         ...click(t + demoBeats.click3, { x: POINTER_BTN.x, y: POINTER_BTN.y }),
         at(
            t + demoBeats.click3 + 0.72,
            { opacity: 1, x: POINTER_RECOIL.x, y: POINTER_RECOIL.y, scale: 1 },
            curve.out(2),
         ),
         hold(t + demoBeats.exit),
         at(
            t + demoBeats.exit + 0.25,
            { opacity: 0, x: POINTER_RECOIL.x, y: POINTER_RECOIL.y, scale: 1 },
            curve.in(2),
         ),
      ]);

      scene.animate("cart screen swaps out after checkout click", screenCart, [
         at(t + 0, { opacity: 1 }),
         hold(t + demoBeats.click1 + 0.18),
         at(t + demoBeats.click1 + 0.36, { opacity: 0 }),
      ]);
      scene.animate("shipping screen swaps in then out", screenShipping, [
         at(t + 0, { opacity: 0 }),
         hold(t + demoBeats.click1 + 0.18),
         at(t + demoBeats.click1 + 0.36, { opacity: 1 }),
         hold(t + demoBeats.click2 + 0.18),
         at(t + demoBeats.click2 + 0.36, { opacity: 0 }),
      ]);
      scene.animate("payment screen swaps in after continue click", screenPayment, [
         at(t + 0, { opacity: 0 }),
         hold(t + demoBeats.click2 + 0.18),
         at(t + demoBeats.click2 + 0.36, { opacity: 1 }),
      ]);

      scene.animate("checkout button flashes on click", btnCheckout, buttonFlash(t + demoBeats.click1));
      scene.animate("continue button flashes on click", btnContinue, buttonFlash(t + demoBeats.click2));
      scene.animate("pay button flashes on failed click", btnPay, buttonFlash(t + demoBeats.click3));

      scene.animate("payment timeout error banner drops in", errorBanner, [
         at(t + 0, { opacity: 0, y: -12 }),
         hold(t + demoBeats.click3 + 0.7),
         at(t + demoBeats.click3 + 1.02, { opacity: 1, y: 0 }, curve.backOut(1.6)),
      ]);
   });

   return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
         <div className="relative" style={{ width: PHONE_W, height: PHONE_H }}>
            <MobileFrame ref={phone.ref} width={PHONE_W} height={PHONE_H}>
               <TestScreen elRef={screenCart.ref}>
                  <ScreenHeader title="Cart" />
                  <div className="flex-1 px-4 pt-3">
                     <CartItem name="iPhone 15 Pro" price="$999" />
                     <CartItem name="USB-C Charger" price="$29" />
                     <div className="flex items-center justify-between pt-4">
                        <span className="text-[11px] tracking-wide text-black/45 uppercase">Total</span>
                        <span className="text-[15px] font-semibold text-black">$1,028</span>
                     </div>
                  </div>
                  <div className="px-4 pb-5">
                     <ChromeButton ref={btnCheckout.ref}>Checkout</ChromeButton>
                  </div>
               </TestScreen>

               <TestScreen elRef={screenShipping.ref}>
                  <ScreenHeader title="Shipping" />
                  <div className="flex-1 space-y-4 px-4 pt-4">
                     <Field label="Address" value="123 Market St" />
                     <Field label="City" value="San Francisco" />
                     <Field label="ZIP" value="94103" />
                  </div>
                  <div className="px-4 pb-5">
                     <ChromeButton ref={btnContinue.ref}>Continue</ChromeButton>
                  </div>
               </TestScreen>

               <TestScreen elRef={screenPayment.ref}>
                  <ScreenHeader title="Payment" />
                  <div className="flex-1 space-y-4 px-4 pt-4">
                     <Field label="Card number" value="4242 4242 4242 4242" />
                     <div className="flex gap-3">
                        <Field label="MM/YY" value="08 / 27" className="flex-1" />
                        <Field label="CVC" value="•••" className="flex-1" />
                     </div>
                  </div>

                  <div
                     ref={errorBanner.ref}
                     className="absolute top-14 right-3 left-3 flex items-center justify-between bg-red-500 px-3 py-2 text-[11px] font-medium text-white"
                     style={{ opacity: 0, transform: "translateY(-12px)" }}
                  >
                     <span>Error · Pay request timed out</span>
                     <span className="text-white/70">!</span>
                  </div>

                  <div className="px-4 pb-5">
                     <ChromeButton ref={btnPay.ref}>Pay $1,028</ChromeButton>
                  </div>
               </TestScreen>
            </MobileFrame>

            <Pointer ref={pointer.ref} label="Autosana" />
         </div>
      </div>
   );
}

function TestScreen({
   elRef,
   children,
   className,
}: {
   elRef: React.RefCallback<HTMLDivElement>;
   children: React.ReactNode;
   className?: string;
}) {
   return (
      <div
         ref={elRef}
         className={cn("absolute inset-0 flex flex-col bg-white text-black", className)}
         style={{ opacity: 0 }}
      >
         {children}
      </div>
   );
}

function CartItem({ name, price }: { name: string; price: string }) {
   return (
      <div className="flex items-center justify-between border-b border-black/5 py-3">
         <span className="text-[13px] font-medium text-black">{name}</span>
         <span className="text-[13px] text-black/55">{price}</span>
      </div>
   );
}

function ChromeButton({ ref, children }: { ref?: React.Ref<HTMLButtonElement>; children: React.ReactNode }) {
   return (
      <button
         ref={ref}
         className="w-full bg-black py-3 text-[13px] font-semibold text-white"
         style={{ backgroundColor: "rgb(0,0,0)", color: "#ffffff" }}
      >
         {children}
      </button>
   );
}
