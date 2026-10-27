import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import api from '../api/client';
import { fmtDateTime } from '../utils/format';

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);

  const loadNotifs = () =>
    api.get('/notifications').then(({ data }) => { setNotifs(data.notifications); setUnread(data.unread); }).catch(() => {});

  useEffect(() => {
    if (user) loadNotifs(); else { setNotifs([]); setUnread(0); }
  }, [user]);

  const toggleBell = async () => {
    const next = !bellOpen;
    setBellOpen(next);
    if (next && unread) {
      await api.put('/notifications/read-all').catch(() => {});
      setUnread(0);
    }
  };

  const doLogout = () => {
    dispatch(logout());
    setOpen(false);
    nav('/');
  };

  return (
    <nav className="navbar navbar-expand-lg im-nav navbar-dark">
      <div className="container">
        <Link to="/" className="im-logo navbar-brand"><span className="notch" aria-hidden="true" />iMovies</Link>
        <button className="navbar-toggler" type="button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-2" onClick={() => setOpen(false)}>
            <li className="nav-item"><NavLink className="nav-link" to="/" end>Movies</NavLink></li>
            {user && <li className="nav-item"><NavLink className="nav-link" to="/my-bookings">My bookings</NavLink></li>}
            {user?.role === 'admin' && <li className="nav-item"><NavLink className="nav-link" to="/admin">Admin</NavLink></li>}
            {user ? (
              <>
                <li className="nav-item dropdown position-relative">
                  <button className="nav-link btn btn-link position-relative" onClick={(e) => { e.stopPropagation(); toggleBell(); }} aria-label={`Notifications${unread ? `, ${unread} new` : ''}`}>
                    Alerts
                    {unread > 0 && <span className="badge rounded-pill bg-warning text-dark bell-badge">{unread}</span>}
                  </button>
                  {bellOpen && (
                    <div className="dropdown-menu dropdown-menu-end show notif-menu p-2" onClick={(e) => e.stopPropagation()}>
                      {notifs.length === 0 && <div className="meta p-2">No alerts yet. Booking updates will show up here.</div>}
                      {notifs.map((n) => (
                        <div key={n._id} className="p-2 border-bottom">
                          <strong className="d-block">{n.title}</strong>
                          <span className="meta d-block">{n.message}</span>
                          <small className="text-muted">{fmtDateTime(n.createdAt)}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
                <li className="nav-item"><span className="nav-link text-white">Hi, {user.name.split(' ')[0]}</span></li>
                <li className="nav-item"><button className="btn btn-outline-light btn-sm" onClick={doLogout}>Log out</button></li>
              </>
            ) : (
              <>
                <li className="nav-item"><NavLink className="nav-link" to="/login">Log in</NavLink></li>
                <li className="nav-item"><Link className="btn btn-marquee btn-sm" to="/register">Sign up</Link></li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
