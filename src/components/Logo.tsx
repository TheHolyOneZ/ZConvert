import logoSrc from "../../src-tauri/icons/128x128.png";

interface Props {
  size?: number;
  className?: string;
}

export default function Logo({ size = 16, className }: Props) {
  return (
    <img
      src={logoSrc}
      width={size}
      height={size}
      className={className}
      alt="ZConvert"
      style={{ objectFit: "contain" }}
    />
  );
}
