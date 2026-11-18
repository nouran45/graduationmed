export default function Loading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-white"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-gray-600">
          Loading...
        </p>
      </div>
    </main>
  )
}
