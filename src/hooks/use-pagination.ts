"use client"

import * as React from "react"

interface UsePaginationOptions {
  totalItems: number
  itemsPerPage: number
  initialPage?: number
  siblingCount?: number
}

interface UsePaginationReturn {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  startIndex: number
  endIndex: number
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  firstPage: () => void
  lastPage: () => void
  canGoToNextPage: boolean
  canGoToPreviousPage: boolean
}

export function usePagination({
  totalItems,
  itemsPerPage,
  initialPage = 1,
  siblingCount = 1,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = React.useState(initialPage)

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems - 1)

  const goToPage = React.useCallback(
    (page: number) => {
      const pageNumber = Math.max(1, Math.min(page, totalPages))
      setCurrentPage(pageNumber)
    },
    [totalPages]
  )

  const nextPage = React.useCallback(() => {
    goToPage(currentPage + 1)
  }, [currentPage, goToPage])

  const previousPage = React.useCallback(() => {
    goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  const firstPage = React.useCallback(() => {
    goToPage(1)
  }, [goToPage])

  const lastPage = React.useCallback(() => {
    goToPage(totalPages)
  }, [totalPages, goToPage])

  const canGoToNextPage = currentPage < totalPages
  const canGoToPreviousPage = currentPage > 1

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    canGoToNextPage,
    canGoToPreviousPage,
  }
}