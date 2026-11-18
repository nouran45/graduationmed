"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
    fetchProducts,
    invalidateApiCache,
    isAbortError,
} from "./api"
import { groupProducts } from "./marketplace"
import type { ApiProduct, ProductParams } from "./types"

const LIVE_REFRESH_INTERVAL = 30_000

const errMsg = (e: unknown) =>
    e instanceof Error ? e.message : "Something went wrong."

/**
 * General asynchronous data hook.
 *
 * Automatically revalidates data every 30 seconds.
 * Preserves existing data if a background request fails.
 */
export function useAsync<T>(
    fn: (s: AbortSignal) => Promise<T>,
    key: string,
    enabled = true
) {
    const [state, setState] = useState<{
        data: T | null
        loading: boolean
        error: string
    }>({
        data: null,
        loading: enabled,
        error: "",
    })

    const fnRef = useRef(fn)
    const stateRef = useRef(state)

    fnRef.current = fn
    stateRef.current = state

    useEffect(() => {
        if (!enabled) return

        let disposed = false
        let running = false
        let controller: AbortController | null = null

        const execute = async (background = false) => {
            if (
                disposed ||
                running ||
                document.visibilityState !== "visible" ||
                !navigator.onLine
            ) {
                return
            }

            // Do not refresh until the initial request has completed.
            if (background && stateRef.current.data === null) {
                return
            }

            running = true
            controller = new AbortController()

            if (background) {
                invalidateApiCache()
            } else {
                setState(s => ({
                    ...s,
                    loading: true,
                    error: "",
                }))
            }

            try {
                const data = await fnRef.current(controller.signal)

                if (!disposed && !controller.signal.aborted) {
                    setState({
                        data,
                        loading: false,
                        error: "",
                    })
                }
            } catch (e) {
                if (
                    !disposed &&
                    !controller.signal.aborted &&
                    !isAbortError(e)
                ) {
                    setState(s => ({
                        ...s,
                        loading: false,
                        error: s.data === null ? errMsg(e) : "",
                    }))
                }
            } finally {
                running = false
                controller = null
            }
        }

        // Initial request.
        void execute()

        // Background synchronization.
        const timer = window.setInterval(() => {
            void execute(true)
        }, LIVE_REFRESH_INTERVAL)

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                void execute(true)
            }
        }

        const handleOnline = () => {
            void execute(true)
        }

        document.addEventListener(
            "visibilitychange",
            handleVisibility
        )

        window.addEventListener("online", handleOnline)

        return () => {
            disposed = true

            window.clearInterval(timer)

            document.removeEventListener(
                "visibilitychange",
                handleVisibility
            )

            window.removeEventListener("online", handleOnline)

            controller?.abort()
        }
    }, [key, enabled])

    return state
}

/**
 * Paginated pharmacy feed.
 *
 * Features:
 * - Preserves existing pagination.
 * - Automatically refreshes loaded pages every 30 seconds.
 * - Updates stock, prices, and product availability.
 * - Keeps existing products visible during refresh.
 * - Refreshes when the customer returns to the tab.
 * - Refreshes when internet connectivity returns.
 */
export function useProductFeed(
    params: ProductParams,
    pageSize = 24,
    enabled = true
) {
    const key = JSON.stringify(params) + pageSize

    const paramsRef = useRef(params)
    paramsRef.current = params

    const [retryCount, setRetryCount] = useState(0)

    const [state, setState] = useState({
        items: [] as ApiProduct[],
        total: 0,
        nextOffset: 0,
        loading: enabled,
        loadingMore: false,
        refreshing: false,
        error: "",
        done: false,
    })

    const ctrl = useRef<AbortController | null>(null)
    const refreshCtrl = useRef<AbortController | null>(null)

    const refreshingRef = useRef(false)
    const stateRef = useRef(state)

    stateRef.current = state

    /**
     * Initial page loading.
     */
    useEffect(() => {
        if (!enabled) return

        ctrl.current?.abort()
        refreshCtrl.current?.abort()

        refreshingRef.current = false

        const c = new AbortController()
        ctrl.current = c

        setState({
            items: [],
            total: 0,
            nextOffset: 0,
            loading: true,
            loadingMore: false,
            refreshing: false,
            error: "",
            done: false,
        })

        fetchProducts(
            {
                ...paramsRef.current,
                limit: pageSize,
                offset: 0,
            },
            c.signal
        )
            .then(r => {
                if (c.signal.aborted) return

                setState({
                    items: r.items,
                    total: r.total,
                    nextOffset: pageSize,
                    loading: false,
                    loadingMore: false,
                    refreshing: false,
                    error: "",
                    done: r.done ?? r.items.length < pageSize,
                })
            })
            .catch(e => {
                if (c.signal.aborted || isAbortError(e)) return

                setState(s => ({
                    ...s,
                    loading: false,
                    error: errMsg(e),
                }))
            })

        return () => {
            c.abort()
            refreshCtrl.current?.abort()
            refreshingRef.current = false
        }
    }, [key, enabled, pageSize, retryCount])

    /**
     * Load the next page.
     */
    const loadMore = useCallback(() => {
        const s = stateRef.current
        const c = ctrl.current

        if (
            s.loading ||
            s.loadingMore ||
            s.done ||
            !c ||
            c.signal.aborted
        ) {
            return
        }

        setState(p => ({
            ...p,
            loadingMore: true,
            error: "",
        }))

        fetchProducts(
            {
                ...paramsRef.current,
                limit: pageSize,
                offset: s.nextOffset,
            },
            c.signal
        )
            .then(r => {
                if (c.signal.aborted) return

                setState(p => {
                    const seen = new Set(
                        p.items.map(i => `${i.pharmacy_id}-${i.id}`)
                    )

                    const fresh = r.items.filter(
                        i => !seen.has(`${i.pharmacy_id}-${i.id}`)
                    )

                    return {
                        ...p,
                        items: [...p.items, ...fresh],
                        total: r.total,
                        nextOffset: p.nextOffset + pageSize,
                        loadingMore: false,
                        done: r.done ?? r.items.length < pageSize,
                    }
                })
            })
            .catch(e => {
                if (c.signal.aborted || isAbortError(e)) return

                setState(p => ({
                    ...p,
                    loadingMore: false,
                    error: errMsg(e),
                }))
            })
    }, [pageSize])

    /**
     * Refresh all pages already loaded by the customer.
     *
     * Does not reload the browser or clear the visible products.
     */
    const refresh = useCallback(async () => {
        const current = stateRef.current

        if (
            !enabled ||
            current.loading ||
            current.loadingMore ||
            current.items.length === 0 ||
            refreshingRef.current ||
            document.visibilityState !== "visible" ||
            !navigator.onLine
        ) {
            return
        }

        refreshingRef.current = true

        const controller = new AbortController()
        refreshCtrl.current = controller

        setState(s => ({
            ...s,
            refreshing: true,
        }))

        try {
            // Force subsequent requests to retrieve fresh API data.
            invalidateApiCache()

            const pageCount = Math.ceil(
                current.nextOffset / pageSize
            )

            const responses = await Promise.all(
                Array.from(
                    { length: pageCount },
                    (_, index) =>
                        fetchProducts(
                            {
                                ...paramsRef.current,
                                limit: pageSize,
                                offset: index * pageSize,
                            },
                            controller.signal
                        )
                )
            )

            if (controller.signal.aborted) return

            const updated: ApiProduct[] = []
            const seen = new Set<string>()

            for (const response of responses) {
                for (const item of response.items) {
                    const id = `${item.pharmacy_id}-${item.id}`

                    if (!seen.has(id)) {
                        seen.add(id)
                        updated.push(item)
                    }
                }
            }

            setState(s => ({
                ...s,
                items: updated,
                total: responses[0]?.total ?? s.total,
                refreshing: false,
                error: "",
            }))
        } catch (e) {
            if (
                !controller.signal.aborted &&
                !isAbortError(e)
            ) {
                // Keep the existing products if refresh fails.
                setState(s => ({
                    ...s,
                    refreshing: false,
                }))
            }
        } finally {
            refreshingRef.current = false
        }
    }, [enabled, pageSize])

    /**
     * Automatic background synchronization.
     */
    useEffect(() => {
        if (!enabled) return

        const timer = window.setInterval(() => {
            void refresh()
        }, LIVE_REFRESH_INTERVAL)

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                void refresh()
            }
        }

        const handleOnline = () => {
            void refresh()
        }

        document.addEventListener(
            "visibilitychange",
            handleVisibility
        )

        window.addEventListener("online", handleOnline)

        return () => {
            window.clearInterval(timer)

            document.removeEventListener(
                "visibilitychange",
                handleVisibility
            )

            window.removeEventListener("online", handleOnline)

            refreshCtrl.current?.abort()
        }
    }, [enabled, refresh])

    const groups = useMemo(
        () => groupProducts(state.items),
        [state.items]
    )

    const retry = useCallback(
        () => setRetryCount(n => n + 1),
        []
    )

    return {
        ...state,
        groups,
        loadMore,
        refresh,
        retry,
    }
}

/**
 * True once the element has scrolled near the viewport.
 * Used to lazy-load below-the-fold shelves.
 */
export function useInView<T extends Element>(
    rootMargin = "300px"
) {
    const ref = useRef<T | null>(null)
    const [seen, setSeen] = useState(false)

    useEffect(() => {
        const el = ref.current

        if (!el || seen) return

        if (typeof IntersectionObserver === "undefined") {
            setSeen(true)
            return
        }

        const io = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    setSeen(true)
                    io.disconnect()
                }
            },
            { rootMargin }
        )

        io.observe(el)

        return () => io.disconnect()
    }, [seen, rootMargin])

    return [ref, seen] as const
}