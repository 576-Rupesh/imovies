import { mediaUrl } from '../utils/format';

const PALETTES = [
  ['#a81f3c', '#2b1030'], ['#14587e', '#0b1d3a'], ['#c9791b', '#4a1d12'],
  ['#1f7a63', '#0e2a34'], ['#6b3fa0', '#1b1240'], ['#b5304f', '#3a1f5c'],
];
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// Uses the uploaded poster, otherwise draws a typographic poster from the title.
export default function Poster({ movie }) {
  if (movie.poster) {
    return <img className="poster" src={mediaUrl(movie.poster)} alt={`${movie.title} poster`} loading="lazy" />;
  }
  const [a, b] = PALETTES[hash(movie.title) % PALETTES.length];
  return (
    <div className="poster poster-gen" style={{ background: `linear-gradient(160deg, ${a}, ${b})` }} role="img" aria-label={`${movie.title} poster`}>
      <span className="poster-genre">{movie.genres?.join(', ')}</span>
      <span className="poster-title">{movie.title}</span>
    </div>
  );
}
