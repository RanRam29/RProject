interface LogoMarkProps {
  size?: number;
}

export default function LogoMark({ size = 30 }: LogoMarkProps) {
  const fontSize = Math.round(size * 0.37);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '30%',
        background: 'linear-gradient(135deg, #5B8DEF 0%, #A78BFA 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: '#fff',
          fontSize,
          fontWeight: 800,
          letterSpacing: '-0.3px',
          lineHeight: 1,
          fontFamily: 'var(--font-sans)',
        }}
      >
        RP
      </span>
    </div>
  );
}
