// frontend/src/components/LoadingSkeleton.jsx

const TableSkeleton = () => {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 animate-pulse">
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="grid grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
      
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="px-6 py-4 border-b border-gray-100">
          <div className="grid grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((col) => (
              <div key={col} className="h-4 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const CardSkeleton = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-5 bg-gray-200 rounded"></div>
          <div className="h-5 w-5 bg-gray-200 rounded"></div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded w-16"></div>
          <div className="h-6 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="h-3 bg-gray-100 rounded w-full"></div>
        <div className="h-3 bg-gray-100 rounded w-2/3"></div>
      </div>
    </div>
  );
};

const StatCardSkeleton = () => {
  return (
    <div className="bg-gray-50 rounded-lg p-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
      <div className="h-8 bg-gray-200 rounded w-12"></div>
    </div>
  );
};

export { TableSkeleton, CardSkeleton, StatCardSkeleton };