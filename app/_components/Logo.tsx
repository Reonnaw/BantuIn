import { HeartHandshake } from "lucide-react";

export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-lg border-2 border-neutral-900 bg-blue-500 shadow-[3px_3px_0_0_#171717] dark:border-neutral-100 dark:shadow-[3px_3px_0_0_#f5f5f5]"
    >
      <HeartHandshake
        className="text-white"
        style={{ width: size * 0.52, height: size * 0.52 }}
        strokeWidth={2.4}
      />
    </div>
  );
}

export function LogoLockup({
  size = 44,
  tagline,
}: {
  size?: number;
  tagline?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      <div>
        <p className="font-pixel text-xl leading-none tracking-tight text-neutral-900 dark:text-neutral-50">
          Bantu<span className="text-blue-600 dark:text-blue-400">In</span>
        </p>
        {tagline && (
          <p className="mt-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
}
