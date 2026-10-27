import { useEffect, useState } from 'react';
import api, { errMsg } from '../api/client';
import MovieCard from '../components/MovieCard';
import Pagination from '../components/Pagination';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';

const empty = { q: '', genre: '', language: '', city: '', theatre: '', date: '' };

export default function Home() {
  const [filters, setFilters] = useState(empty);
  const [q, setQ] = useState('');
  const [options, setOptions] = useState({ genres: [], languages: [], cities: [] });
  const [theatres, setTheatres] = useState([]);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/movies/filters').then(({ data }) => setOptions(data)).catch(() => {}); }, []);

  // theatre dropdown follows the chosen city
  useEffect(() => {
    api.get('/theatres', { params: { city: filters.city || undefined } })
      .then(({ data }) => setTheatres(data.theatres)).catch(() => {});
  }, [filters.city]);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => { setFilters((f) => ({ ...f, q })); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries({ ...filters, page, limit: 8 }).filter(([, v]) => v !== ''));
    api.get('/movies', { params })
      .then(({ data }) => setData(data))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [filters, page]);

  const set = (key) => (e) => {
    const value = e.target.value;
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value, ...(key === 'city' ? { theatre: '' } : {}) }));
  };
  const reset = () => { setQ(''); setFilters(empty); setPage(1); };
  const today = new Date().toISOString().slice(0, 10);
  const active = Object.values(filters).some(Boolean);

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Pick a film. Pick your seat.</h1>
          <p>See what is playing near you, check which seats are free right now, and book in a minute.</p>
        </div>
      </section>

      <div className="container">
        <form className="filter-bar row g-2" onSubmit={(e) => e.preventDefault()} role="search">
          <div className="col-12 col-lg-4">
            <label className="visually-hidden" htmlFor="q">Search movies</label>
            <input id="q" className="form-control" placeholder="Search by title, director or actor" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="col-6 col-lg-2">
            <label className="visually-hidden" htmlFor="genre">Genre</label>
            <select id="genre" className="form-select" value={filters.genre} onChange={set('genre')}>
              <option value="">All genres</option>
              {options.genres.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <label className="visually-hidden" htmlFor="language">Language</label>
            <select id="language" className="form-select" value={filters.language} onChange={set('language')}>
              <option value="">All languages</option>
              {options.languages.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <label className="visually-hidden" htmlFor="city">City</label>
            <select id="city" className="form-select" value={filters.city} onChange={set('city')}>
              <option value="">Any city</option>
              {options.cities.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <label className="visually-hidden" htmlFor="date">Date</label>
            <input id="date" type="date" min={today} className="form-control" value={filters.date} onChange={set('date')} />
          </div>
          <div className="col-12 col-lg-6">
            <label className="visually-hidden" htmlFor="theatre">Theatre</label>
            <select id="theatre" className="form-select" value={filters.theatre} onChange={set('theatre')}>
              <option value="">Any theatre</option>
              {theatres.map((t) => <option key={t._id} value={t._id}>{t.name}, {t.city}</option>)}
            </select>
          </div>
          {active && (
            <div className="col-12 col-lg-2">
              <button type="button" className="btn btn-outline-dark w-100" onClick={reset}>Clear filters</button>
            </div>
          )}
        </form>

        <section className="py-4" aria-live="polite">
          {loading && <Loader label="Finding movies" />}
          {!loading && data?.movies.length === 0 && (
            <div className="empty">
              <h2 className="h5">No movies match these filters</h2>
              <p>Try another date or city, or clear the filters to see everything.</p>
              <button className="btn btn-curtain" onClick={reset}>Clear filters</button>
            </div>
          )}
          {!loading && data?.movies.length > 0 && (
            <>
              <p className="meta">{data.total} movie{data.total === 1 ? '' : 's'}</p>
              <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-4">
                {data.movies.map((m) => <div className="col" key={m._id}><MovieCard movie={m} /></div>)}
              </div>
              <Pagination page={data.page} pages={data.pages} onChange={setPage} />
            </>
          )}
        </section>
      </div>
    </>
  );
}
