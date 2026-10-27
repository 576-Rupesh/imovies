import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errMsg } from '../../api/client';
import Pagination from '../../components/Pagination';

const blank = { title: '', description: '', genres: '', language: '', duration: '', rating: 'U/A', score: '', releaseDate: '', status: 'now_showing', director: '', cast: '', poster: '' };

export default function AdminMovies() {
  const [list, setList] = useState(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null = hidden
  const [editId, setEditId] = useState(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get('/movies', { params: { status: 'all', page, limit: 8 } }).then(({ data }) => setList(data)).catch((e) => toast.error(errMsg(e)));
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const edit = (m) => {
    setEditId(m._id);
    setFile(null);
    setForm({ ...blank, ...m, genres: m.genres.join(', '), cast: m.cast.join(', '), releaseDate: m.releaseDate.slice(0, 10), score: m.score || '' });
  };
  const close = () => { setForm(null); setEditId(null); setFile(null); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      ['title', 'description', 'genres', 'language', 'duration', 'rating', 'score', 'releaseDate', 'status', 'director', 'cast', 'poster'].forEach((k) => {
        if (form[k] !== undefined && form[k] !== null) fd.append(k, form[k]);
      });
      if (file) fd.append('poster', file);
      if (editId) await api.put(`/movies/${editId}`, fd); else await api.post('/movies', fd);
      toast.success(editId ? 'Movie updated' : 'Movie added');
      close();
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m) => {
    if (!window.confirm(`Delete "${m.title}"? Movies with bookings are archived instead.`)) return;
    try { const { data } = await api.delete(`/movies/${m._id}`); toast.success(data.message); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Movies</h2>
        {!form && <button className="btn btn-curtain btn-sm" onClick={() => { setForm(blank); setEditId(null); }}>Add movie</button>}
      </div>

      {form && (
        <form className="ticket mb-4" onSubmit={save}>
          <h3>{editId ? 'Edit movie' : 'Add a movie'}</h3>
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label" htmlFor="m-title">Title</label><input id="m-title" className="form-control" required value={form.title} onChange={set('title')} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="m-lang">Language</label><input id="m-lang" className="form-control" required value={form.language} onChange={set('language')} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="m-dur">Duration (minutes)</label><input id="m-dur" type="number" min="30" max="400" className="form-control" required value={form.duration} onChange={set('duration')} /></div>
            <div className="col-12"><label className="form-label" htmlFor="m-desc">Description</label><textarea id="m-desc" rows="3" className="form-control" required value={form.description} onChange={set('description')} /></div>
            <div className="col-md-4"><label className="form-label" htmlFor="m-gen">Genres (comma separated)</label><input id="m-gen" className="form-control" value={form.genres} onChange={set('genres')} /></div>
            <div className="col-md-4"><label className="form-label" htmlFor="m-dir">Director</label><input id="m-dir" className="form-control" value={form.director} onChange={set('director')} /></div>
            <div className="col-md-4"><label className="form-label" htmlFor="m-cast">Cast (comma separated)</label><input id="m-cast" className="form-control" value={form.cast} onChange={set('cast')} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="m-rel">Release date</label><input id="m-rel" type="date" className="form-control" required value={form.releaseDate} onChange={set('releaseDate')} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="m-rate">Certificate</label>
              <select id="m-rate" className="form-select" value={form.rating} onChange={set('rating')}><option>U</option><option>U/A</option><option>A</option></select></div>
            <div className="col-md-3"><label className="form-label" htmlFor="m-score">Audience score (0 to 10)</label><input id="m-score" type="number" step="0.1" min="0" max="10" className="form-control" value={form.score} onChange={set('score')} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="m-status">Status</label>
              <select id="m-status" className="form-select" value={form.status} onChange={set('status')}><option value="now_showing">Now showing</option><option value="upcoming">Upcoming</option><option value="archived">Archived</option></select></div>
            <div className="col-md-6"><label className="form-label" htmlFor="m-file">Poster image (JPG, PNG, WebP, max 2 MB)</label><input id="m-file" type="file" accept="image/jpeg,image/png,image/webp" className="form-control" onChange={(e) => setFile(e.target.files[0] || null)} /></div>
            <div className="col-md-6"><label className="form-label" htmlFor="m-poster">Or poster URL</label><input id="m-poster" className="form-control" value={form.poster} onChange={set('poster')} /></div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-curtain" disabled={saving}>{saving ? 'Saving' : 'Save movie'}</button>
            <button type="button" className="btn btn-outline-dark" onClick={close}>Cancel</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table className="table table-sm mb-0 align-middle">
          <thead><tr><th>Title</th><th>Language</th><th>Genres</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list?.movies.map((m) => (
              <tr key={m._id}>
                <td>{m.title}</td><td>{m.language}</td><td>{m.genres.join(', ')}</td><td>{m.status.replace('_', ' ')}</td>
                <td className="text-end text-nowrap">
                  <button className="btn btn-outline-dark btn-sm me-2" onClick={() => edit(m)}>Edit</button>
                  <button className="btn btn-outline-danger btn-sm" onClick={() => remove(m)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list && <Pagination page={list.page} pages={list.pages} onChange={setPage} />}
    </>
  );
}
