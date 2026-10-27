import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container empty">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist or has moved.</p>
      <Link to="/" className="btn btn-curtain">Browse movies</Link>
    </div>
  );
}
