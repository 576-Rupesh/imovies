export default function Loader({ label = 'Loading' }) {
  return (
    <div className="empty" role="status">
      <div className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
      {label}
    </div>
  );
}
