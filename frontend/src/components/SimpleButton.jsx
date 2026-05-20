export default function SimpleButton({ onClick, text, color, size = 'medium', description }) {
  const sizeClass = {
    small:  'px-4 py-2 text-lg',
    medium: 'px-6 py-3 text-xl',
    large:  'px-8 py-4 text-2xl w-full',
  }[size];

  const colorClass = {
    blue:   'bg-blue-600 hover:bg-blue-700',
    green:  'bg-green-600 hover:bg-green-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    red:    'bg-red-600 hover:bg-red-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    gray:   'bg-gray-600 hover:bg-gray-700',
  }[color] || 'bg-blue-600 hover:bg-blue-700';

  return (
    <button
      onClick={onClick}
      className={`${sizeClass} ${colorClass} text-white font-bold rounded-lg transition-all shadow-lg active:scale-95`}
    >
      {text}
      {description && <div className="text-sm mt-1 opacity-90">{description}</div>}
    </button>
  );
}
