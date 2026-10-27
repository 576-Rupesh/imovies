import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { errMsg } from '../api/client';
import Poster from '../components/Poster';
import Loader from '../components/Loader';
import { dayKey, fmtTime, money, runtime } from '../utils/format';

export default function MovieDetails() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [city, setCity] = useState('');
  const [cities, setCities] = useState([]);
  const [date, setDate] = useState(dayKey(new Date()));
  const [loading, setLoading] = useState(true);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86400000)), []);

  useEffect(() => {
    api.get(`/movies/${id}`).then(({ data }) => setMovie(data.movie)).catch((e) => toast.error(errMsg(e)));
    api.get('/movies/filters').then(({ data }) => setCities(data.cities)).catch(() => {});
  }, [id]);

  useEffect(() => {
    setLoading(true);
    api.get('/shows', { params: { movie: id, date, city: city || undefined } })
      .then(({ data }) => setShows(data.shows))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id, date, city]);

  const byTheatre = useMemo(() => {
    const map = {};
    shows.forEach((s) => { (map[s.theatre._id] = map[s.theatre._id] || { theatre: s.theatre, shows: [] }).shows.push(s); });
    return Object.values(map);
  }, [shows]);

  if (!movie) return <Loader label="Loading movie" />;

  return (
    <>
      <section className="detail-head">
        <div className="container">
          <div className="row g-4 align-items-start">
            <div className="col-5 col-md-3"><Poster movie={movie} /></div>
            <div className="col-12 col-md-9">
              <h1>{movie.title}</h1>
              <div className="meta d-flex flex-wrap gap-3 mb-3">
                <span>{movie.language}</span>
                <span>{runtime(movie.duration)}</span>
                <span>{movie.rating}</span>
                {movie.score > 0 && <span>{movie.score}/10 audience score</span>}
              </div>
              <div className="mb-3 d-flex flex-wrap gap-2">{movie.genres.map((g) => <span key={g} className="chip">{g}</span>)}</div>
              <p style={{ maxWidth: '62ch' }}>{movie.description}</p>
              {movie.director && <p className="meta mb-1">Directed by {movie.director}</p>}
              {movie.cast?.length > 0 && <p className="meta mb-0">Starring {movie.cast.join(', ')}</p>}
            </div>
          </div>
        </div>
      </section>

      <div className="container py-4">
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
          <h2 className="h4 mb-0">Pick a show</h2>
          <div>
            <label htmlFor="city" className="visually-hidden">City</label>
            <select id="city" className="form-select" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All cities</option>
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="date-strip mb-4" role="group" aria-label="Choose a date">
          {days.map((d) => (
            <button key={dayKey(d)} type="button" className={`date-btn ${date === dayKey(d) ? 'active' : ''}`} aria-pressed={date === dayKey(d)} onClick={() => setDate(dayKey(d))}>
              {d.toLocaleDateString('en-IN', { weekday: 'short' })}
              <strong>{d.getDate()}</strong>
              {d.toLocaleDateString('en-IN', { month: 'short' })}
            </button>
          ))}
        </div>

        {loading && <Loader label="Loading shows" />}
        {!loading && byTheatre.length === 0 && (
          <div className="empty"><p className="mb-0">No shows on this day. Try another date{city ? ' or city' : ''}.</p></div>
        )}
        {!loading && byTheatre.map(({ theatre, shows: list }) => (
          <div className="theatre-row" key={theatre._id}>
            <h3 className="h6 mb-0">{theatre.name}</h3>
            <p className="meta mb-3">{theatre.city}, {theatre.address}</p>
            {list.map((s) => {
              const cls = s.availableSeats === 0 ? 'sold' : s.availableSeats / s.totalSeats < 0.25 ? 'low' : '';
              const inner = (<>{fmtTime(s.startTime)}<small>{s.availableSeats === 0 ? 'Sold out' : `${money(s.price)} from, ${s.availableSeats} left`}</small></>);
              return s.availableSeats === 0
                ? <span key={s._id} className={`show-chip ${cls}`}>{inner}</span>
                : <Link key={s._id} to={`/shows/${s._id}/seats`} className={`show-chip ${cls}`}>{inner}</Link>;
            })}
          </div>
        ))}
      </div>
    </>
  );
}
