import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api, { errMsg } from '../api/client';
import { clearHold } from '../store/bookingSlice';
import Countdown from '../components/Countdown';
import { fmtDateTime, money } from '../utils/format';

const FEE_PER_TICKET = 20;

export default function Checkout() {
  const hold = useSelector((s) => s.booking);
  const dispatch = useDispatch();
  const nav = useNavigate();
  const [card, setCard] = useState({ cardNumber: '', name: '', expiry: '', cvv: '' });
  const [paying, setPaying] = useState(false);

  if (!hold.showId || hold.seats.length === 0) return <Navigate to="/" replace />;

  const subtotal = hold.seats.reduce((s, x) => s + x.price, 0);
  const fee = FEE_PER_TICKET * hold.seats.length;
  const total = subtotal + fee;

  const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
  const fmtExp = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const backToSeats = () => { dispatch(clearHold()); nav(`/shows/${hold.showId}/seats`); };

  const pay = async (e) => {
    e.preventDefault();
    setPaying(true);
    try {
      const { data } = await api.post('/bookings', {
        showId: hold.showId,
        seats: hold.seats.map((s) => s.label),
        payment: card,
      });
      dispatch(clearHold());
      toast.success('Payment successful. Your seats are booked.');
      nav(`/booking/${data.booking.id}`, { replace: true });
    } catch (err) {
      const status = err.response?.status;
      toast.error(errMsg(err));
      if (status === 409) backToSeats(); // hold lost: pick again
    } finally {
      setPaying(false);
    }
  };

  const ready = card.cardNumber.replace(/\s/g, '').length >= 13 && card.name.trim().length > 1 && card.expiry.length === 5 && card.cvv.length >= 3;

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">Payment</h1>
      <div className="row g-4">
        <div className="col-lg-7">
          <form className="ticket" onSubmit={pay} noValidate>
            <h2 className="mb-3">Card details</h2>
            <div className="mb-3">
              <label htmlFor="cn" className="form-label">Card number</label>
              <input id="cn" className="form-control" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={card.cardNumber} onChange={(e) => setCard({ ...card, cardNumber: fmtCard(e.target.value) })} />
            </div>
            <div className="mb-3">
              <label htmlFor="nm" className="form-label">Name on card</label>
              <input id="nm" className="form-control" autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label htmlFor="ex" className="form-label">Expiry (MM/YY)</label>
                <input id="ex" className="form-control" inputMode="numeric" autoComplete="cc-exp" placeholder="08/29" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: fmtExp(e.target.value) })} />
              </div>
              <div className="col-6">
                <label htmlFor="cv" className="form-label">CVV</label>
                <input id="cv" type="password" className="form-control" inputMode="numeric" autoComplete="cc-csc" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
              </div>
            </div>
            <p className="meta">Demo payment: use 4242 4242 4242 4242 with any future expiry. A card ending in 0002 is declined so you can test failures.</p>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-dark" onClick={backToSeats} disabled={paying}>Change seats</button>
              <button className="btn btn-curtain flex-grow-1" disabled={!ready || paying}>{paying ? 'Processing payment' : `Pay ${money(total)}`}</button>
            </div>
          </form>
        </div>

        <div className="col-lg-5">
          <div className="ticket sticky-side">
            <h2>{hold.info.movieTitle}</h2>
            <p className="meta mb-0">{hold.info.theatreName}, {hold.info.city}</p>
            <p className="meta mb-0">{hold.info.screen}, {fmtDateTime(hold.info.startTime)}</p>
            <div className="ticket-cut" />
            {hold.seats.map((s) => (
              <div className="row-line" key={s.label}><span>Seat {s.label} ({s.category})</span><span>{money(s.price)}</span></div>
            ))}
            <div className="row-line"><span>Booking fee</span><span>{money(fee)}</span></div>
            <div className="ticket-cut" />
            <div className="row-line total"><span>Total</span><span>{money(total)}</span></div>
            {hold.lockedUntil && (
              <p className="mt-3 mb-0">Seats held for <Countdown until={hold.lockedUntil} onExpire={() => { toast.warn('Your seat hold ran out.'); backToSeats(); }} /></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
