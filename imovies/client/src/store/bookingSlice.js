import { createSlice } from '@reduxjs/toolkit';

// Holds the seat selection while the user moves from the seat map to checkout.
const slice = createSlice({
  name: 'booking',
  initialState: { showId: null, seats: [], lockedUntil: null, info: null },
  reducers: {
    setHold: (state, { payload }) => ({ ...state, ...payload }),
    clearHold: () => ({ showId: null, seats: [], lockedUntil: null, info: null }),
  },
});

export const { setHold, clearHold } = slice.actions;
export default slice.reducer;
