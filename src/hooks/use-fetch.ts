"use client"

import * as React from "react"
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query"

interface UseFetchOptions<TData, TError> extends UseQueryOptions<TData, TError> {
  url: string
  headers?: Record<string, string>
}

export function useFetch<TData = unknown, TError = Error>({
  url,
  headers,
  ...options
}: UseFetchOptions<TData, TError>) {
  return useQuery<TData, TError>({
    queryKey: options.queryKey || [url],
    queryFn: async () => {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response.json()
    },
    ...options,
  })
}

interface UsePostOptions<TData, TError, TVariables> extends UseMutationOptions<TData, TError, TVariables> {
  url: string
  headers?: Record<string, string>
}

export function usePost<TData = unknown, TError = Error, TVariables = unknown>({
  url,
  headers,
  ...options
}: UsePostOptions<TData, TError, TVariables>) {
  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables) => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(variables),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response.json()
    },
    ...options,
  })
}

interface UsePutOptions<TData, TError, TVariables> extends UseMutationOptions<TData, TError, TVariables> {
  url: string
  headers?: Record<string, string>
}

export function usePut<TData = unknown, TError = Error, TVariables = unknown>({
  url,
  headers,
  ...options
}: UsePutOptions<TData, TError, TVariables>) {
  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables) => {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(variables),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response.json()
    },
    ...options,
  })
}

interface UseDeleteOptions<TData, TError> extends UseMutationOptions<TData, TError, void> {
  url: string
  headers?: Record<string, string>
}

export function useDelete<TData = unknown, TError = Error>({
  url,
  headers,
  ...options
}: UseDeleteOptions<TData, TError>) {
  return useMutation<TData, TError, void>({
    mutationFn: async () => {
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response.json()
    },
    ...options,
  })
}