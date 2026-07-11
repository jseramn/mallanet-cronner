export default function AppLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8 animate-pulse" aria-busy="true" aria-label="Cargando">
      <div className="h-7 w-48 rounded-md bg-muted" />
      <div className="h-4 w-72 max-w-full rounded-md bg-muted" />
      <div className="mt-4 h-64 w-full rounded-lg border bg-muted/40" />
    </div>
  )
}
