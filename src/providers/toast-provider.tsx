"use client"

import * as React from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "../components/ui/toast"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
  action?: React.ReactNode
}

interface ToastState {
  toasts: Toast[]
}

type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "REMOVE"; toastId: string }

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD":
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      }
    case "REMOVE":
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.toastId),
      }
    default:
      return state
  }
}

const ToastContext = React.createContext<{
  toast: (props: Omit<Toast, "id">) => void
  dismiss: (toastId: string) => void
} | null>(null)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(toastReducer, { toasts: [] })

  const toast = React.useCallback((props: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    dispatch({ type: "ADD", toast: { ...props, id } })

    setTimeout(() => {
      dispatch({ type: "REMOVE", toastId: id })
    }, 5000)
  }, [])

  const dismiss = React.useCallback((toastId: string) => {
    dispatch({ type: "REMOVE", toastId })
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      <ToastProvider>
        {children}
        {state.toasts.map((toastItem) => (
          <Toast key={toastItem.id} variant={toastItem.variant}>
            <div className="grid gap-1">
              {toastItem.title && <ToastTitle>{toastItem.title}</ToastTitle>}
              {toastItem.description && (
                <ToastDescription>{toastItem.description}</ToastDescription>
              )}
            </div>
            {toastItem.action}
            <ToastClose onClick={() => dismiss(toastItem.id)} />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  )
}