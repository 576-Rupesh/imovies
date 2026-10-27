import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import api, { errMsg } from '../api/client';
import { socket } from '../api/socket';
import { setHold } from '../store/bookingSlice';
import SeatMap from '../components/SeatMap';
import Countdown from '../components/Countdown';
import Loader from '../components/Loader';
import { fmtDateTime, money } from '../utils/format';

const MAX = 8;

export default function SeatSelection() {
  const { id } = useParams();
  const nav = useNavigate();
  const dispatch = useDispatch();
  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [busy, setBusy] = useState(false);
  const selectedRef = useRef([]);
  const proceeding = useRef(false);

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/shows/${id}`);
      setShow(data.show);
      setSeats(data.seats);
      const mine = data.seats.filter((s) => s.lockedByMe);
      setSelected(mine.map((s) => s.label));
      setLockedUntil(mine.length ? mine.reduce((a, s) => (s.lockedUntil > a ? s.lockedUntil : a), mine[0].lockedUntil) : null);
    } catch (e) {
      toast.error(errMsg(e));
      nav('/');
    }
  }, [id, nav]);

  useEffect(() => {
    load();

    // live seat updates from other people
    const onUpdate = (payload) => {
      if (payload.showId !== id) return;
      setSeats((prev) => prev.map((s) => {
        const u = payload.seats.find((x) => x.label === s.label);
        if (!u || selectedRef.current.includes(s.label)) return s;
        return { ...s, status: u.status };
      }));
    };
    socket.connect();
    socket.emit('show:join', id);
    socket.on('seat:update', onUpdate);
    // after a dropped connection the server forgets our room, so rejoin and resync
    const onReconnect = () => { socket.emit('show:join', id); load(); };
    socket.io.on('reconnect', onReconnect);

    return () => {
      socket.off('seat:update', onUpdate);
      socket.io.off('reconnect', onReconnect);
      socket.emit('show:leave', id);
      socket.disconnect();
      if (!proceeding.current && selectedRef.current.length) api.post(`/shows/${id}/release`).catch(() => {});
    };
  }, [id, load]);

  const toggle = async (seat) => {
    if (busy) return;
    const isSel = selected.includes(seat.label);
    if (!isSel && seat.status !== 'available') return;
    const next = isSel ? selected.filter((l) => l !== seat.label) : [...selected, seat.label];
    if (next.length > MAX) return toast.info(`You can book up to ${MAX} seats at once`);

    setBusy(true);
    try {
      const { data } = await api.post(`/shows/${id}/lock`, { seats: next });
      setSelected(next);
      setLockedUntil(data.lockedUntil || null);
    } catch (e) {
      toast.error(errMsg(e));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onExpire = () => {
    toast.warn('Your seat hold ran out. Please pick your seats again.');
    setSelected([]);
    setLockedUntil(null);
    load();
  };

  if (!show) return <Loader label="Loading seat map" />;

  const chosen = seats.filter((s) => selected.includes(s.label));
  const subtotal = chosen.reduce((sum, s) => sum + s.price, 0);

  const proceed = () => {
    proceeding.current = true;
    dispatch(setHold({
      showId: id,
      seats: chosen.map(({ label, price, category }) => ({ label, price, category })),
      lockedUntil,
      info: {
        movieTitle: show.movie.title, theatreName: show.theatre.name, city: show.theatre.city,
        screen: show.screen, startTime: show.startTime,
      },
    }));
    nav('/checkout');
  };

  return (
    <div className="container py-4">
      <div className="mb-3">
        <h1 className="h3 mb-1">{show.movie.title}</h1>
        <p className="meta mb-0">{show.theatre.name}, {show.theatre.city}, {show.screen}, {fmtDateTime(show.startTime)}</p>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="ticket">
            <div className="screen-curve" aria-hidden="true" />
            <p className="meta text-center mb-0">Screen is this way</p>
            <SeatMap seats={seats} selected={selected} onToggle={toggle} cols={show.screenCols} />
            <div className="legend" aria-label="Seat key">
              <span><span className="seat" />Available</span>
              <span><span className="seat selected" />Your pick</span>
              <span><span className="seat held" />Held by someone else</span>
              <span><span className="seat booked" />Taken</span>
              <span><span className="seat premium" />Premium</span>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="ticket sticky-side">
            <h2>Your seats</h2>
            {chosen.length === 0 ? (
              <p className="meta mb-0">Tap a seat to pick it. You can choose up to {MAX}.</p>
            ) : (
              <>
                {chosen.map((s) => (
                  <div className="row-line" key={s.label}><span>{s.label} ({s.category})</span><span>{money(s.price)}</span></div>
                ))}
                <div className="ticket-cut" />
                <div className="row-line total"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                <p className="meta mb-3">Booking fee is added at checkout.</p>
                {lockedUntil && <p className="mb-3">Seats held for <Countdown until={lockedUntil} onExpire={onExpire} /></p>}
                <button className="btn btn-curtain w-100" onClick={proceed} disabled={busy}>Continue to payment</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
