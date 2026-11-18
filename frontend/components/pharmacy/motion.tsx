"use client"

import { useEffect, useState } from "react"
import { useInView } from "@/lib/pharmacy/hooks"

function useReducedMotion() {
    const [reduced, setReduced] = useState(false)
    useEffect(() => {
        setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    }, [])
    return reduced
}

/** Fades and slides content in when it scrolls into view. */
export function Reveal({
    children, delay = 0, y = 24, className = "",
}: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
    const [ref, seen] = useInView<HTMLDivElement>("0px 0px -6% 0px")
    const reduced = useReducedMotion()
    const show = seen || reduced
    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: show ? 1 : 0,
                transform: show ? "none" : `translateY(${y}px)`,
                transition: reduced ? "none" : `opacity .6s ease ${delay}ms, transform .65s cubic-bezier(.2,.7,.2,1) ${delay}ms`,
            }}
        >
            {children}
        </div>
    )
}

/** Counts up to a number the first time it is seen. */
export function CountUp({ to, duration = 1200 }: { to: number; duration?: number }) {
    const [ref, seen] = useInView<HTMLSpanElement>("0px")
    const reduced = useReducedMotion()
    const [value, setValue] = useState(0)
    useEffect(() => {
        if (!seen) return
        if (reduced) { setValue(to); return }
        let raf = 0
        const start = performance.now()
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration)
            setValue(Math.round(to * (1 - Math.pow(1 - t, 3))))
            if (t < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [seen, to, duration, reduced])
    return <span ref={ref}>{value.toLocaleString()}</span>
}

/** Keyframes used by the pharmacy-powered landing sections. Render once per page. */
export function MotionStyles() {
    return (
        <style>{`
      @keyframes mc-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      @keyframes mc-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
      .mc-marquee { animation: mc-marquee 45s linear infinite }
      .mc-marquee:hover { animation-play-state: paused }
      .mc-float { animation: mc-float 6s ease-in-out infinite }
      .mc-float-slow { animation: mc-float 9s ease-in-out infinite }
      @media (prefers-reduced-motion: reduce) {
        .mc-marquee, .mc-float, .mc-float-slow { animation: none !important }
      }
    `}</style>
    )
}

/** Endless horizontal ticker. Pauses on hover. */
export function Marquee({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            <div className="mc-marquee flex w-max items-center gap-3">
                <div className="flex items-center gap-3">{children}</div>
                <div className="flex items-center gap-3" aria-hidden>{children}</div>
            </div>
        </div>
    )
}