const SIZES = { sm: "h-6 w-6 text-xs", md: "h-9 w-9 text-sm", lg: "h-20 w-20 text-2xl" } as const;

export default function Avatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
}: {
  name: string;
  avatarUrl: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const sizeClass = SIZES[size];

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-black/10 font-medium text-black/60 dark:bg-white/10 dark:text-white/60 ${className}`}
    >
      {initial}
    </span>
  );
}
