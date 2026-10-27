import { useEffect, useState } from 'react';
import api from '../../api/client';
import { money, fmtDateTime } from '../../utils/format';
import AdminMovies from './AdminMovies';
import AdminTheatres from './AdminTheatres';
import AdminShows from './AdminShows';
import Pagination from '../../components/Pagination';

function Overview() {
  const [stats, setStats] = useState(null);
  const [bk, setBk] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => { api.get('/admin/stats').then(({ data }) => setStats(data.stats)).catch(() => {}); }, []);
  useEffect(() => { api.get('/admin/bookings', { params: { page, limit: 8 } }).then(({ data }) => setBk(data)).catch(() => {}); }, [page]);

  const cards = stats && [
    ['Revenue', money(stats.revenue)], ['Confirmed bookings', stats.bookings],
    ['Upcoming shows', stats.upcomingShows], ['Movies', stats.movies], ['Customers', stats.users],
  ];

  return (
    <>
      <div className="row g-3 mb-4">
        {cards?.map(([label, value]) => (
          <div className="col-6 col-lg" key={label}><div className="stat"><strong>{value}</strong><span className="meta">{label}</span></div></div>
        ))}
      </div>
      <h2 className="h5">Recent bookings</h2>
      <div className="table-wrap">
        <table className="table table-sm mb-0 align-middle">
          <thead><tr><th>Code</th><th>Customer</th><th>Movie</th><th>Show</th><th>Seats</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {bk?.bookings.map((b) => (
              <tr key={b._id}>
                <td>{b.bookingCode}</td><td>{b.user?.name}</td><td>{b.movie?.title}</td>
                <td>{fmtDateTime(b.showTime)}</td><td>{b.seats.map((s) => s.label).join(', ')}</td>
                <td>{money(b.totalAmount)}</td>
                <td><span className={`badge ${b.status === 'confirmed' ? 'bg-success' : 'bg-secondary'}`}>{b.status}</span></td>
              </tr>
            ))}
            {bk?.bookings.length === 0 && <tr><td colSpan="7" className="empty">No bookings yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {bk && <Pagination page={bk.page} pages={bk.pages} onChange={setPage} />}
    </>
  );
}

const TABS = [['overview', 'Overview', Overview], ['movies', 'Movies', AdminMovies], ['theatres', 'Theatres', AdminTheatres], ['shows', 'Shows', AdminShows]];

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const Active = TABS.find((t) => t[0] === tab)[2];
  return (
    <div className="container py-4">
      <h1 className="h3 mb-3">Admin dashboard</h1>
      <ul className="nav admin-tabs mb-4">
        {TABS.map(([k, label]) => (
          <li className="nav-item" key={k}><button className={`nav-link ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</button></li>
        ))}
      </ul>
      <Active />
    </div>
  );
}
