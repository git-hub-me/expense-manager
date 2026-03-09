const SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

export default function AppLogo({ size = 'md' }) {
  return (
    <img
      src="/logo.png"
      alt="Expense Tracker"
      className={`${SIZE_CLASSES[size]} object-contain`}
    />
  );
}
