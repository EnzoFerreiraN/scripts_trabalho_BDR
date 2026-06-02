export default function Badge({ children, variant = 'blue', style }) {
  return (
    <span className={`badge badge-${variant}`} style={style}>
      {children}
    </span>
  );
}
