export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-borda/50 ${className}`} />
}

export function SkeletonLinhas({ linhas = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}
