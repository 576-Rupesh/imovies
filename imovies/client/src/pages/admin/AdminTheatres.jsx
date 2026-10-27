import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errMsg } from '../../api/client';

const blank = { name: '', city: '', address: '', screens: [{ name: 'Screen 1', rows: 8, cols: 12 }] };

export default function AdminTheatres() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);

  const load = useCallback(() => { api.get('/theatres').then(({ data }) => setList(data.theatres)).catch((e) => toast.error(errMsg(e))); }, []);
  useEffect(() => { load(); }, [load]);

  const setScreen = (i, k, v) => setForm({ ...form, screens: form.screens.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });
  const close = () => { setForm(null); setEditId(null); };

  const save = async (e) => {
    e.preventDefault();
    try {
      const body = { ...form, screens: form.screens.map((s) => ({ name: s.name, rows: Number(s.rows), cols: Number(s.cols) })) };
      if (editId) await api.put(`/theatres/${editId}`, body); else await api.post('/theatres', body);
      toast.success(editId ? 'Theatre updated' : 'Theatre added');
      close(); load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete ${t.name}?`)) return;
    try { await api.delete(`/theatres/${t._id}`); toast.success('Theatre deleted'); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Theatres</h2>
        {!form && <button className="btn btn-curtain btn-sm" onClick={() => setForm(blank)}>Add theatre</button>}
      </div>

      {form && (
        <form className="ticket mb-4" onSubmit={save}>
          <h3>{editId ? 'Edit theatre' : 'Add a theatre'}</h3>
          <div className="row g-3">
            <div className="col-md-4"><label className="form-label" htmlFor="t-name">Name</label><input id="t-name" className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="t-city">City</label><input id="t-city" className="form-control" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="col-md-5"><label className="form-label" htmlFor="t-addr">Address</label><input id="t-addr" className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <h4 className="h6 mt-4">Screens</h4>
          {form.screens.map((s, i) => (
            <div className="row g-2 mb-2 align-items-end" key={i}>
              <div className="col-md-5"><label className="form-label" htmlFor={`s-n${i}`}>Screen name</label><input id={`s-n${i}`} className="form-control" required value={s.name} onChange={(e) => setScreen(i, 'name', e.target.value)} /></div>
              <div className="col-6 col-md-3"><label className="form-label" htmlFor={`s-r${i}`}>Rows (1 to 20)</label><input id={`s-r${i}`} type="number" min="1" max="20" className="form-control" required value={s.rows} onChange={(e) => setScreen(i, 'rows', e.target.value)} /></div>
              <div className="col-6 col-md-3"><label className="form-label" htmlFor={`s-c${i}`}>Seats per row (1 to 30)</label><input id={`s-c${i}`} type="number" min="1" max="30" className="form-control" required value={s.cols} onChange={(e) => setScreen(i, 'cols', e.target.value)} /></div>
              <div className="col-md-1"><button type="button" className="btn btn-outline-danger btn-sm w-100" disabled={form.screens.length === 1} onClick={() => setForm({ ...form, screens: form.screens.filter((_, j) => j !== i) })} aria-label={`Remove ${s.name || 'screen'}`}>Remove</button></div>
            </div>
          ))}
          <button type="button" className="btn btn-outline-dark btn-sm mt-1" onClick={() => setForm({ ...form, screens: [...form.screens, { name: `Screen ${form.screens.length + 1}`, rows: 8, cols: 12 }] })}>Add screen</button>
          <div className="d-flex gap-2 mt-4">
            <button className="btn btn-curtain">Save theatre</button>
            <button type="button" className="btn btn-outline-dark" onClick={close}>Cancel</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table className="table table-sm mb-0 align-middle">
          <thead><tr><th>Name</th><th>City</th><th>Screens</th><th /></tr></thead>
          <tbody>
            {list.map((t) => (
              <tr key={t._id}>
                <td>{t.name}</td><td>{t.city}</td>
                <td>{t.screens.map((s) => `${s.name} (${s.rows * s.cols} seats)`).join(', ')}</td>
                <td className="text-end text-nowrap">
                  <button className="btn btn-outline-dark btn-sm me-2" onClick={() => { setEditId(t._id); setForm({ name: t.name, city: t.city, address: t.address, screens: t.screens }); }}>Edit</button>
                  <button className="btn btn-outline-danger btn-sm" onClick={() => remove(t)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
