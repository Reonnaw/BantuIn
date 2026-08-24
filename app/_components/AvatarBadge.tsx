export function AvatarBadge({
  initial,
  color,
  size = "size-10",
}: {
  initial: string;
  color: string;
  size?: string;
}) {
  return (
    <div
      className={`${size} shrink-0 rounded-lg ${color} flex items-center justify-center border-2 border-neutral-900 dark:border-neutral-100 font-pixel text-white`}
    >
      {initial}
    </div>
  );
}
