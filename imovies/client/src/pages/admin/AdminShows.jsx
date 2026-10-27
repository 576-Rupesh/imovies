import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errMsg } from '../../api/client';
import { fmtDateTime, money } from '../../utils/format';

export default function AdminShows() {
  const [shows, setShows] = useState([]);
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [form, setForm] = useState(null);

  const load = useCallback(() => {
    api.get('/shows').then(({ data }) => setShows(data.shows)).catch((e) => toast.error(errMsg(e)));
  }, []);

  useEffect(() => {
    load();
    api.get('/movies', { params: { status: 'all', limit: 50 } }).then(({ data }) => setMovies(data.movies.filter((m) => m.status !== 'archived')));
    api.get('/theatres').then(({ data }) => setTheatres(data.theatres));
  }, [load]);

  const theatre = theatres.find((t) => t._id === form?.theatreId);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post('/shows', { ...form, startTime: new Date(form.startTime).toISOString() });
      toast.success('Show scheduled and seats created');
      setForm(null); load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const remove = async (s) => {
    if (!window.confirm('Delete this show?')) return;
    try { await api.delete(`/shows/${s._id}`); toast.success('Show deleted'); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Upcoming shows</h2>
        {!form && <button className="btn btn-curtain btn-sm" onClick={() => setForm({ movieId: '', theatreId: '', screen: '', startTime: '', price: 200 })}>Schedule a show</button>}
      </div>

      {form && (
        <form className="ticket mb-4" onSubmit={save}>
          <h3>Schedule a show</h3>
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label" htmlFor="sh-m">Movie</label>
              <select id="sh-m" className="form-select" required value={form.movieId} onChange={(e) => setForm({ ...form, movieId: e.target.value })}>
                <option value="">Choose a movie</option>{movies.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}</select></div>
            <div className="col-md-6"><label className="form-label" htmlFor="sh-t">Theatre</label>
              <select id="sh-t" className="form-select" required value={form.theatreId} onChange={(e) => setForm({ ...form, theatreId: e.target.value, screen: '' })}>
                <option value="">Choose a theatre</option>{theatres.map((t) => <option key={t._id} value={t._id}>{t.name}, {t.city}</option>)}</select></div>
            <div className="col-md-4"><label className="form-label" htmlFor="sh-s">Screen</label>
              <select id="sh-s" className="form-select" required disabled={!theatre} value={form.screen} onChange={(e) => setForm({ ...form, screen: e.target.value })}>
                <option value="">Choose a screen</option>{theatre?.screens.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.rows * s.cols} seats)</option>)}</select></div>
            <div className="col-md-4"><label className="form-label" htmlFor="sh-d">Start time</label>
              <input id="sh-d" type="datetime-local" className="form-control" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label" htmlFor="sh-p">Standard ticket price (₹)</label>
              <input id="sh-p" type="number" min="1" className="form-control" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <div className="form-text">Premium rows cost 40% more.</div></div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-curtain">Schedule show</button>
            <button type="button" className="btn btn-outline-dark" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table className="table table-sm mb-0 align-middle">
          <thead><tr><th>Movie</th><th>Theatre</th><th>Screen</th><th>Starts</th><th>Price</th><th>Seats free</th><th /></tr></thead>
          <tbody>
            {shows.map((s) => (
              <tr key={s._id}>
                <td>{s.movie?.title}</td><td>{s.theatre?.name}</td><td>{s.screen}</td><td>{fmtDateTime(s.startTime)}</td>
                <td>{money(s.price)}</td><td>{s.availableSeats}/{s.totalSeats}</td>
                <td className="text-end"><button className="btn btn-outline-danger btn-sm" onClick={() => remove(s)}>Delete</button></td>
              </tr>
            ))}
            {shows.length === 0 && <tr><td colSpan="7" className="empty">No upcoming shows.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
