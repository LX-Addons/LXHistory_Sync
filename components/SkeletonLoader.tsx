interface SkeletonLoaderProps {
  count?: number
}

export default function SkeletonLoader({ count = 5 }: SkeletonLoaderProps) {
  return (
    <div className="skeleton-container">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-item">
          <div className="skeleton-icon" />
          <div className="skeleton-content">
            <div className="skeleton-title" />
            <div className="skeleton-url" />
          </div>
        </div>
      ))}
    </div>
  )
}
