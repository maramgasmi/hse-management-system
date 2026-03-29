const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  actionLabel 
}) => {
  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        {Icon && <Icon className="h-8 w-8 text-gray-400" />}
      </div>
      <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">{description}</p>
      {action && actionLabel && (
        <div className="mt-6">
          <button
            onClick={action}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;