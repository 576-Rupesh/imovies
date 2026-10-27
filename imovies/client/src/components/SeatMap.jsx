import { money } from '../utils/format';

// seats: [{label,row,number,category,price,status}]  selected: [label]
export default function SeatMap({ seats, selected, onToggle, cols }) {
  const rows = [];
  seats.forEach((s) => {
    let r = rows.find((x) => x.row === s.row);
    if (!r) { r = { row: s.row, seats: [], category: s.category }; rows.push(r); }
    r.seats.push(s);
  });
  const aisleAfter = Math.floor(cols / 2);
  let lastCategory = null;

  return (
    <div className="seat-scroll">
      <div className="seat-grid">
        {rows.map((r) => {
          const showTier = r.category !== lastCategory;
          lastCategory = r.category;
          const tierPrice = money(r.seats[0].price);
          return (
            <div key={r.row}>
              {showTier && (
                <div className="seat-tier">{r.category === 'premium' ? 'Premium' : 'Standard'}, {tierPrice}</div>
              )}
              <div className="seat-row">
                <span className="seat-row-label" aria-hidden="true">{r.row}</span>
                {r.seats.map((s) => {
                  const isSel = selected.includes(s.label);
                  const cls = ['seat', s.category === 'premium' ? 'premium' : '', s.number === aisleAfter ? 'aisle' : '',
                    isSel ? 'selected' : s.status === 'booked' ? 'booked' : s.status === 'locked' ? 'held' : ''].join(' ');
                  const state = isSel ? 'selected' : s.status === 'booked' ? 'taken' : s.status === 'locked' ? 'held by someone else' : 'available';
                  return (
                    <button
                      key={s.label}
                      type="button"
                      className={cls}
                      disabled={!isSel && s.status !== 'available'}
                      aria-pressed={isSel}
                      aria-label={`Seat ${s.label}, ${s.category}, ${money(s.price)}, ${state}`}
                      onClick={() => onToggle(s)}
                    >
                      {s.number}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
