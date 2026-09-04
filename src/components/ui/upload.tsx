"use client"

import * as React from "react"
import { Upload, X, File, Image, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface UploadFile extends File {
  id: string
  preview?: string
  progress?: number
}

interface FileUploadProps {
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSize?: number
  onFilesChange?: (files: UploadFile[]) => void
  onFileRemove?: (file: UploadFile) => void
  disabled?: boolean
  className?: string
}

const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      accept,
      multiple = false,
      maxFiles = 5,
      maxSize = 10 * 1024 * 1024, // 10MB
      onFilesChange,
      onFileRemove,
      disabled = false,
      className,
    },
    ref
  ) => {
    const [files, setFiles] = React.useState<UploadFile[]>([])
    const [isDragging, setIsDragging] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const handleFiles = React.useCallback(
      (newFiles: FileList | File[]) => {
        setError(null)
        const fileArray = Array.from(newFiles)

        if (files.length + fileArray.length > maxFiles) {
          setError(`Maximum ${maxFiles} files allowed`)
          return
        }

        const validFiles = fileArray.filter((file) => {
          if (file.size > maxSize) {
            setError(`File ${file.name} exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`)
            return false
          }
          return true
        })

        const uploadFiles: UploadFile[] = validFiles.map((file) => {
          const uploadFile = file as UploadFile
          uploadFile.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

          if (file.type.startsWith("image/")) {
            const reader = new FileReader()
            reader.onload = (e) => {
              uploadFile.preview = e.target?.result as string
              setFiles((prev) => [...prev])
            }
            reader.readAsDataURL(file)
          }

          return uploadFile
        })

        setFiles((prev) => {
          const updated = [...prev, ...uploadFiles]
          onFilesChange?.(updated)
          return updated
        })
      },
      [files.length, maxFiles, maxSize, onFilesChange]
    )

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(true)
    }, [])

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
    }, [])

    const handleDrop = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (!disabled) {
          handleFiles(e.dataTransfer.files)
        }
      },
      [disabled, handleFiles]
    )

    const handleInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
          handleFiles(e.target.files)
        }
      },
      [handleFiles]
    )

    const handleRemove = React.useCallback(
      (file: UploadFile) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
        setFiles((prev) => {
          const updated = prev.filter((f) => f.id !== file.id)
          onFilesChange?.(updated)
          return updated
        })
        onFileRemove?.(file)
      },
      [onFilesChange, onFileRemove]
    )

    const getFileIcon = (type: string) => {
      if (type.startsWith("image/")) return <Image className="h-4 w-4" />
      if (type.includes("pdf")) return <FileText className="h-4 w-4" />
      return <File className="h-4 w-4" />
    }

    return (
      <div ref={ref} className={cn("w-full", className)}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            "relative flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />
          <Upload className="mb-4 h-8 w-8 text-muted-foreground" />
          <p className="mb-2 text-sm text-muted-foreground">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">
            {accept ? accept.split(",").join(", ") : "Any file type"} (max. {Math.round(maxSize / 1024 / 1024)}MB)
          </p>
        </div>

        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center space-x-3">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(file)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)
FileUpload.displayName = "FileUpload"

export { FileUpload }
export type { FileUploadProps, UploadFile }