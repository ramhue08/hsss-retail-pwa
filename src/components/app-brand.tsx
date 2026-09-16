import Image from "next/image";
import Link from "next/link";

type AppBrandProps = {
  variant?: "light" | "dark";
  showSubtitle?: boolean;
  linkTo?: string;
  size?: "sm" | "md" | "header";
};

const LOGO = {
  src: "/logo.png",
  width: 359,
  height: 240,
  alt: "Hydro Seal Shower Systems",
} as const;

const SIZE_HEIGHT = {
  header: 32,
  sm: 48,
  md: 64,
} as const;

export function AppBrand({
  linkTo,
  size = "md",
  // Kept for existing call sites; full logo already includes brand text/colors.
  variant: _variant = "dark",
  showSubtitle: _showSubtitle = true,
}: AppBrandProps) {
  const height = SIZE_HEIGHT[size];
  const width = Math.round((LOGO.width / LOGO.height) * height);

  const content = (
    <Image
      src={LOGO.src}
      alt={LOGO.alt}
      width={width}
      height={height}
      className="h-auto w-auto object-contain"
      style={{ width, height }}
      priority
    />
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="inline-flex transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
