import HaangoLogo from '../Assets/F_Transparent_B.png';

export default function Logo({
  size = 'md',
  className = '',
}) {
  const sizes = {
    sm: 'h-8',
    md: 'h-9',
    lg: 'h-14',
  };

  return (
    <div className={`${sizes[size]} ${className}`}>
      <img
        src={HaangoLogo}
        alt="Haano"
        className="h-full w-auto object-contain"
      />
    </div>
  );
}
