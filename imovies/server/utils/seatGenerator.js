const rowLabel = (i) => String.fromCharCode(65 + i);

// Builds one Seat document per seat for a show. The last two rows are premium.
exports.buildSeats = (show) => {
  const seats = [];
  for (let r = 0; r < show.screenRows; r++) {
    const premium = r >= show.screenRows - 2 && show.screenRows > 4;
    for (let c = 1; c <= show.screenCols; c++) {
      seats.push({
        show: show._id,
        label: `${rowLabel(r)}${c}`,
        row: rowLabel(r),
        rowIndex: r,
        number: c,
        category: premium ? 'premium' : 'standard',
        price: premium ? show.premiumPrice : show.price,
      });
    }
  }
  return seats;
};
