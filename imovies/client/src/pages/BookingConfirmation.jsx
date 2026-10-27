import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import Loader from '../components/Loader';
import { fmtDateTime, money } from '../utils/format';

export default function BookingConfirmation() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/bookings/${id}`).then(({ data }) => setBooking(data.booking)).catch((e) => setError(errMsg(e)));
  }, [id]);

  if (error) return <div className="container empty"><p>{error}</p><Link to="/my-bookings" className="btn btn-curtain">My bookings</Link></div>;
  if (!booking) return <Loader label="Loading your ticket" />;

  const cancelled = booking.status === 'cancelled';

  return (
    <div className="container py-4" style={{ maxWidth: 560 }}>
      <h1 className="h3 mb-3">{cancelled ? 'Booking cancelled' : 'You are going to the movies'}</h1>
      <div className="ticket">
        <p className="meta mb-0">Booking code</p>
        <div className="booking-code">{booking.bookingCode}</div>
        <div className="ticket-cut" />
        <h2>{booking.movie.title}</h2>
        <div className="row-line"><span className="meta">Theatre</span><span>{booking.theatre.name}, {booking.theatre.city}</span></div>
        <div className="row-line"><span className="meta">Screen</span><span>{booking.screen}</span></div>
        <div className="row-line"><span className="meta">Show time</span><span>{fmtDateTime(booking.showTime)}</span></div>
        <div className="row-line"><span className="meta">Seats</span><span>{booking.seats.map((s) => s.label).join(', ')}</span></div>
        <div className="ticket-cut" />
        <div className="row-line"><span className="meta">Tickets</span><span>{money(booking.subtotal)}</span></div>
        <div className="row-line"><span className="meta">Booking fee</span><span>{money(booking.convenienceFee)}</span></div>
        <div className="row-line total"><span>Total paid</span><span>{money(booking.totalAmount)}</span></div>
        {booking.payment && <p className="meta mt-2 mb-0">Card ending {booking.payment.cardLast4}, transaction {booking.payment.transactionId}</p>}
        {cancelled && <p className="text-danger mt-2 mb-0">This booking was cancelled and the amount is being refunded.</p>}
      </div>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-outline-dark" onClick={() => window.print()}>Print ticket</button>
        <Link to="/my-bookings" className="btn btn-curtain">My bookings</Link>
        <Link to="/" className="btn btn-outline-dark">Book another</Link>
      </div>
    </div>
  );
}
