import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { qk } from '../lib/queryKeys'
import { importTrello } from '../api/import'
import { BUCKETS } from '../constants'
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react'

export default function TrelloImportModal({ 
  open, 
  onClose 
}: { 
  open: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const importM = useMutation({
    mutationFn: importTrello,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: qk.tasks.byStatuses(BUCKETS) })
      qc.invalidateQueries({ queryKey: qk.recs.all })
      qc.invalidateQueries({ queryKey: qk.recs.suggestWeek })
      // Show success and close modal after a brief delay
      setTimeout(() => {
        onClose()
        setSelectedFile(null)
      }, 2000)
    }
  })

  if (!open) return null

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/json' || file.name.endsWith('.json') || 
          file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleImport = () => {
    if (selectedFile) {
      importM.mutate(selectedFile)
    }
  }

  const handleClose = () => {
    if (!importM.isPending) {
      onClose()
      setSelectedFile(null)
      importM.reset()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl p-6 w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="import-modal-title" className="text-xl font-semibold">
            Import from Trello
          </h2>
          <button
            onClick={handleClose}
            disabled={importM.isPending}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {importM.isSuccess ? (
          <div className="text-center py-8">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium text-gray-900 mb-2">Import Successful!</p>
            <p className="text-gray-600">
              Imported {importM.data.imported} tasks
              {importM.data.skipped > 0 && ` (${importM.data.skipped} skipped)`}
            </p>
          </div>
        ) : importM.error ? (
          <div className="text-center py-8">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium text-gray-900 mb-2">Import Failed</p>
            <p className="text-red-600 text-sm">
              {importM.error instanceof Error ? importM.error.message : 'An error occurred'}
            </p>
            <button
              onClick={() => importM.reset()}
              className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Upload your Trello board export (JSON or CSV format). Tasks will be imported into your backlog and organized by status.
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : selectedFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText size={24} className="text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drop your Trello export here
                  </p>
                  <p className="text-gray-500 mb-4">or</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                    <Upload size={16} />
                    Choose File
                    <input
                      type="file"
                      accept=".json,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleClose}
                disabled={importM.isPending}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedFile || importM.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                {importM.isPending ? 'Importing...' : 'Import Tasks'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}