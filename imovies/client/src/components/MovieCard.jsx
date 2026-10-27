import { Link } from 'react-router-dom';
import Poster from './Poster';
import { runtime } from '../utils/format';

export default function MovieCard({ movie }) {
  return (
    <Link to={`/movies/${movie._id}`} className="movie-card">
      <Poster movie={movie} />
      <h3>{movie.title}</h3>
      <div className="meta d-flex flex-wrap gap-2 align-items-center">
        <span>{movie.language}</span>
        <span className="chip">{movie.rating}</span>
        <span>{runtime(movie.duration)}</span>
      </div>
    </Link>
  );
}
