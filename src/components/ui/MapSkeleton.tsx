import { FaMap } from "react-icons/fa";

interface MapSkeletonProps {
  className?: string;
}

export function MapSkeleton({ className = "" }: MapSkeletonProps) {
  return (
    <div
      className={`w-full h-full bg-stone-100 rounded-xl animate-pulse flex flex-col items-center justify-center border border-stone-200 ${className}`}
      aria-hidden="true"
    >
      <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center mb-4">
        <FaMap className="w-8 h-8 text-stone-300" />
      </div>
      <div className="space-y-3 w-full max-w-[200px] px-8">
        <div className="h-4 bg-stone-200 rounded w-3/4 mx-auto"></div>
        <div className="h-3 bg-stone-200 rounded w-1/2 mx-auto"></div>
      </div>
    </div>
  );
}
