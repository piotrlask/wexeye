/**
 * The real wexeye logo (public/wexeye-eye.png), recolorable via CSS mask so it
 * can render in different colors (e.g. green/red reactions) without needing
 * separate image assets — text color (via className) becomes the icon color.
 */
export default function EyeIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current wx-eye-mask ${className ?? ""}`}
    />
  );
}
