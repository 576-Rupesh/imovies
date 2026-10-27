import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { errMsg } from '../api/client';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import { fmtDateTime, money } from '../utils/format';

const CUTOFF = 2 * 60 * 60 * 1000;

export default function MyBookings() {
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/bookings/my', { params: { type: tab, page, limit: 5 } })
      .then(({ data }) => setData(data))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [tab, page]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (b) => {
    if (!window.confirm(`Cancel booking ${b.bookingCode}? ${money(b.totalAmount)} will be refunded.`)) return;
    try {
      const { data: res } = await api.put(`/bookings/${b._id}/cancel`);
      toast.success(res.message);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const switchTab = (t) => { setTab(t); setPage(1); };

  return (
    <div className="container py-4">
      <h1 className="h3 mb-3">My bookings</h1>
      <ul className="nav admin-tabs mb-3">
        {[['upcoming', 'Upcoming'], ['past', 'Past and cancelled']].map(([k, label]) => (
          <li className="nav-item" key={k}>
            <button className={`nav-link ${tab === k ? 'active' : ''}`} onClick={() => switchTab(k)}>{label}</button>
          </li>
        ))}
      </ul>

      {loading && <Loader label="Loading bookings" />}
      {!loading && data?.bookings.length === 0 && (
        <div className="empty">
          <p>{tab === 'upcoming' ? 'No upcoming bookings yet.' : 'Nothing here yet.'}</p>
          <Link to="/" className="btn btn-curtain">Find a movie</Link>
        </div>
      )}
      {!loading && data?.bookings.map((b) => {
        const canCancel = b.status === 'confirmed' && new Date(b.showTime).getTime() - Date.now() >= CUTOFF;
        const past = new Date(b.showTime) < new Date();
        return (
          <div className="ticket mb-3" key={b._id}>
            <div className="d-flex flex-wrap justify-content-between gap-2">
              <div>
                <h2 className="mb-1">{b.movie?.title}</h2>
                <p className="meta mb-0">{b.theatre?.name}, {b.theatre?.city}, {b.screen}</p>
                <p className="meta mb-0">{fmtDateTime(b.showTime)}</p>
                <p className="mb-0 mt-2">Seats {b.seats.map((s) => s.label).join(', ')}</p>
              </div>
              <div className="text-md-end">
                <span className={`badge ${b.status === 'cancelled' ? 'bg-secondary' : past ? 'bg-dark' : 'bg-success'}`}>
                  {b.status === 'cancelled' ? 'Cancelled' : past ? 'Watched' : 'Confirmed'}
                </span>
                <div className="total mt-1">{money(b.totalAmount)}</div>
                <div className="meta">{b.bookingCode}</div>
              </div>
            </div>
            <div className="d-flex gap-2 mt-3">
              <Link className="btn btn-outline-dark btn-sm" to={`/booking/${b._id}`}>View ticket</Link>
              {canCancel && <button className="btn btn-outline-danger btn-sm" onClick={() => cancel(b)}>Cancel booking</button>}
              {b.status === 'confirmed' && !past && !canCancel && <span className="meta align-self-center">Too close to show time to cancel</span>}
            </div>
          </div>
        );
      })}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}
