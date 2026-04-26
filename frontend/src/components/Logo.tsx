interface DojoYoshiLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { mark: 24, text: "text-sm", gap: "gap-2" },
  md: { mark: 32, text: "text-lg", gap: "gap-2.5" },
  lg: { mark: 48, text: "text-2xl", gap: "gap-3" },
};

export function DojoYoshiLogo({ size = "md", showText = true, className = "" }: DojoYoshiLogoProps) {
  const s = sizes[size];

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 8L24 26L38 8"
          stroke="#e85a4f"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 26L24 40"
          stroke="#e85a4f"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <circle
          cx="24"
          cy="26"
          r="4"
          fill="#e85a4f"
        />
      </svg>
      {showText && (
        <span
          className={`${s.text} font-bold`}
          style={{ color: "var(--foreground)", letterSpacing: "-0.02em" }}
        >
          Dojo-Yoshi
        </span>
      )}
    </div>
  );
}