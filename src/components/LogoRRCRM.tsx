// Logo oficial RR CRM — Identidade visual aprovada

type LogoVariant = "full" | "compact" | "icon";
type LogoTheme = "dark" | "light" | "on-gradient";

type Props = {
  variant?: LogoVariant;
  theme?: LogoTheme;
  height?: number;
  className?: string;
};

export function LogoRRCRM({
  variant = "full",
  theme = "dark",
  height = 48,
  className,
}: Props) {
  const textMain = theme === "light" ? "#08142d" : "#eaf0ff";
  const textSub = theme === "light" ? "#1a5fd4" : "#4d7ef5";
  const divider =
    theme === "light" ? "rgba(14,63,160,0.14)" : "rgba(80,130,255,0.18)";

  // Círculos em modo "on-gradient" ficam brancos translúcidos
  const c1a = theme === "on-gradient" ? "rgba(255,255,255,0.18)" : "#0e3fa0";
  const c1b = theme === "on-gradient" ? "rgba(255,255,255,0.18)" : "#3070f0";
  const c2a = theme === "on-gradient" ? "rgba(255,255,255,0.28)" : "#3070f0";
  const c2b = theme === "on-gradient" ? "rgba(255,255,255,0.28)" : "#6da0ff";
  const textOnCircle = "#ffffff";

  // ── ÍCONE SOLO ──────────────────────────────────────────
  if (variant === "icon") {
    const s = height / 48;
    return (
      <svg
        className={className}
        width={48 * s}
        height={48 * s}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ico-g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1a} />
            <stop offset="100%" stopColor={c1b} />
          </linearGradient>
          <linearGradient id="ico-g2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c2a} />
            <stop offset="100%" stopColor={c2b} />
          </linearGradient>
        </defs>
        {/* Círculo maior — azul escuro */}
        <circle cx="20" cy="24" r="18" fill="url(#ico-g1)" />
        {/* Círculo menor sobreposto — azul médio */}
        <circle cx="31" cy="24" r="13" fill="url(#ico-g2)" />
        {/* RR — Inter Bold */}
        <text
          x="8"
          y="29"
          fontFamily="'Inter','Helvetica Neue',Arial,sans-serif"
          fontWeight="700"
          fontSize="14"
          fill={textOnCircle}
          letterSpacing="-0.4"
        >
          RR
        </text>
      </svg>
    );
  }

  // ── COMPACTO ─────────────────────────────────────────────
  if (variant === "compact") {
    const baseH = 42;
    const s = height / baseH;
    return (
      <svg
        className={className}
        width={160 * s}
        height={baseH * s}
        viewBox="0 0 160 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cmp-g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1a} />
            <stop offset="100%" stopColor={c1b} />
          </linearGradient>
          <linearGradient id="cmp-g2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c2a} />
            <stop offset="100%" stopColor={c2b} />
          </linearGradient>
        </defs>
        <circle cx="16" cy="21" r="15" fill="url(#cmp-g1)" />
        <circle cx="26" cy="21" r="10.5" fill="url(#cmp-g2)" />
        <text
          x="6"
          y="25.5"
          fontFamily="'Inter','Helvetica Neue',Arial,sans-serif"
          fontWeight="700"
          fontSize="11.5"
          fill={textOnCircle}
          letterSpacing="-0.3"
        >
          RR
        </text>
        {/* Divisória */}
        <line x1="47" y1="8" x2="47" y2="34" stroke={divider} strokeWidth="0.8" />
        {/* Nome */}
        <text
          x="56"
          y="19"
          fontFamily="'Inter','Helvetica Neue',Arial,sans-serif"
          fontWeight="600"
          fontSize="13"
          fill={textMain}
          letterSpacing="-0.3"
        >
          RR CRM
        </text>
        {/* Tagline */}
        <text
          x="56"
          y="30"
          fontFamily="'Inter','Helvetica Neue',Arial,sans-serif"
          fontWeight="500"
          fontSize="6.2"
          fill={textSub}
          letterSpacing="0.22em"
        >
          PLATAFORMA COMERCIAL
        </text>
      </svg>
    );
  }

  // ── FULL ─────────────────────────────────────────────────
  const baseH = 54;
  const s = height / baseH;
  return (
    <svg
      className={className}
      width={232 * s}
      height={baseH * s}
      viewBox="0 0 232 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="full-g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1a} />
          <stop offset="100%" stopColor={c1b} />
        </linearGradient>
        <linearGradient id="full-g2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c2a} />
          <stop offset="100%" stopColor={c2b} />
        </linearGradient>
      </defs>
      {/* Círculo maior */}
      <circle cx="22" cy="27" r="20" fill="url(#full-g1)" />
      {/* Círculo menor sobreposto */}
      <circle cx="35" cy="27" r="14" fill="url(#full-g2)" />
      {/* RR — Inter Bold */}
      <text
        x="9.5"
        y="32"
        fontFamily="'Inter','Helvetica Neue',Arial,sans-serif"
        fontWeight="700"
        fontSize="15.5"
        fill={textOnCircle}
        letterSpacing="-0.4"
      >
        RR
      </text>
      {/* Linha divisória sutil */}
      <line x1="64" y1="10" x2="64" y2="44" stroke={divider} strokeWidth="1" />
      {/* Wordmark */}
      <text
        x="76"
        y="24"
        fontFamily="'Inter','Helvetica Neue',Arial,sans-serif"
        fontWeight="600"
        fontSize="16.5"
        fill={textMain}
        letterSpacing="-0.4"
      >
        RR CRM
      </text>
      {/* Tagline — alinhada com wordmark, mesmo x */}
      <text
        x="76"
        y="38.5"
        fontFamily="'Inter','Helvetica Neue',Arial,sans-serif"
        fontWeight="500"
        fontSize="8"
        fill={textSub}
        letterSpacing="0.26em"
      >
        PLATAFORMA COMERCIAL
      </text>
    </svg>
  );
}

export default LogoRRCRM;
