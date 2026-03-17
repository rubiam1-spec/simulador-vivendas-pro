type LogoVariant = "full" | "compact" | "icon";
type LogoTheme = "dark" | "light" | "gradient";

interface LogoRRCRMProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  height?: number;
  className?: string;
}

export function LogoRRCRM({
  variant = "full",
  theme = "dark",
  height = 40,
  className,
}: LogoRRCRMProps) {
  const textColor =
    theme === "light" ? "#0c1628" : theme === "gradient" ? "url(#logoGrad)" : "#f0f4ff";

  const accentColor =
    theme === "gradient" ? "url(#logoGrad)" : theme === "light" ? "#1a56db" : "#60a5fa";

  const gradientId = `logoGrad_${variant}`;

  if (variant === "icon") {
    const size = height;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 40 40"
        className={className}
        aria-label="RR CRM"
        role="img"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
        {/* Fundo arredondado */}
        <rect width="40" height="40" rx="8" fill={theme === "light" ? "#eef4ff" : "#0c1628"} />
        {/* Letra R bold */}
        <text
          x="7"
          y="29"
          fontFamily="'Inter','Segoe UI',system-ui,sans-serif"
          fontWeight="800"
          fontSize="26"
          fill={`url(#${gradientId})`}
          letterSpacing="-1"
        >
          RR
        </text>
      </svg>
    );
  }

  if (variant === "compact") {
    const aspectRatio = 4.5;
    const width = height * aspectRatio;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 180 40"
        className={className}
        aria-label="RR CRM"
        role="img"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
        {/* Ícone "RR" em box */}
        <rect width="40" height="40" rx="7" fill={theme === "light" ? "#1a56db" : "#1e3a6e"} />
        <text
          x="4"
          y="29"
          fontFamily="'Inter','Segoe UI',system-ui,sans-serif"
          fontWeight="800"
          fontSize="24"
          fill="#ffffff"
          letterSpacing="-1"
        >
          RR
        </text>
        {/* Nome "CRM" */}
        <text
          x="50"
          y="27"
          fontFamily="'Inter','Segoe UI',system-ui,sans-serif"
          fontWeight="700"
          fontSize="20"
          fill={textColor}
          letterSpacing="0.5"
        >
          CRM
        </text>
        {/* Dot accent */}
        <circle cx="152" cy="21" r="3.5" fill={accentColor} />
      </svg>
    );
  }

  // variant === "full"
  const aspectRatio = 6.5;
  const width = height * aspectRatio;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 260 40"
      className={className}
      aria-label="RR CRM — Plataforma Imobiliária"
      role="img"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      {/* Ícone */}
      <rect width="40" height="40" rx="7" fill={theme === "light" ? "#1a56db" : "#1e3a6e"} />
      <text
        x="4"
        y="29"
        fontFamily="'Inter','Segoe UI',system-ui,sans-serif"
        fontWeight="800"
        fontSize="24"
        fill="#ffffff"
        letterSpacing="-1"
      >
        RR
      </text>
      {/* "RR CRM" principal */}
      <text
        x="50"
        y="24"
        fontFamily="'Inter','Segoe UI',system-ui,sans-serif"
        fontWeight="700"
        fontSize="18"
        fill={textColor}
        letterSpacing="0.3"
      >
        RR CRM
      </text>
      {/* Subtitle */}
      <text
        x="50"
        y="37"
        fontFamily="'Inter','Segoe UI',system-ui,sans-serif"
        fontWeight="400"
        fontSize="9.5"
        fill={theme === "light" ? "#4b5563" : "#99bbf5"}
        letterSpacing="1.2"
      >
        PLATAFORMA IMOBILIÁRIA
      </text>
      {/* Dot accent */}
      <circle cx="250" cy="13" r="3.5" fill={accentColor} />
    </svg>
  );
}

export default LogoRRCRM;
