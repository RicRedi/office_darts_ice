export default function ConfirmModal({ open, title, message, actions = [] }) {
  if (!open) return null;

  const variantClass = {
    primary: 'bg-purple-600 text-white',
    danger: 'bg-red-600 text-white',
    neutral: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {message && <p className="text-sm text-gray-600">{message}</p>}
        <div className="flex flex-col gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={`w-full rounded-lg py-2 font-medium ${variantClass[action.variant] ?? variantClass.neutral}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
