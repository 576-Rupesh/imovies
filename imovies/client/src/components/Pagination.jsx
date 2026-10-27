export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="d-flex justify-content-center align-items-center gap-3 mt-4">
      <button className="btn btn-outline-dark btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span className="meta">Page {page} of {pages}</span>
      <button className="btn btn-outline-dark btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
}
