import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice';
import booking from './bookingSlice';

export default configureStore({ reducer: { auth, booking } });
