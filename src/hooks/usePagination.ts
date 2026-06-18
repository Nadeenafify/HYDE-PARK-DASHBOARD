import { useMemo, useState } from 'react'

export interface PaginationResult<T> {
  /** Current (clamped) page, 1-based. */
  page: number
  pageSize: number
  total: number
  totalPages: number
  /** Index of the first item on the current page (0-based). */
  start: number
  /** The slice of items to render for the current page. */
  pageItems: T[]
  setPage: (p: number) => void
  setPageSize: (n: number) => void
}

/**
 * Client-side pagination over an in-memory list.
 * Keeps a 1-based page and a page size, and returns the current slice.
 * The returned `page` is always clamped to the valid range, so shrinking the
 * input list (e.g. after filtering) can never strand you on an empty page.
 */
export function usePagination<T>(items: T[], initialSize = 10): PaginationResult<T> {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialSize)

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize

  const pageItems = useMemo(
    () => items.slice(start, start + pageSize),
    [items, start, pageSize],
  )

  return {
    page: currentPage,
    pageSize,
    total,
    totalPages,
    start,
    pageItems,
    setPage,
    setPageSize,
  }
}
