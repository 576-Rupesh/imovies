import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { errMsg } from '../api/client';

const savedUser = () => {
  try { return JSON.parse(localStorage.getItem('imovies_user')); } catch { return null; }
};
const persist = ({ token, user }) => {
  localStorage.setItem('imovies_token', token);
  localStorage.setItem('imovies_user', JSON.stringify(user));
};

const authCall = (name, url) =>
  createAsyncThunk(`auth/${name}`, async (body, { rejectWithValue }) => {
    try {
      const { data } = await api.post(url, body);
      persist(data);
      return data;
    } catch (e) {
      return rejectWithValue(errMsg(e));
    }
  });

export const login = authCall('login', '/auth/login');
export const register = authCall('register', '/auth/register');

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    localStorage.setItem('imovies_user', JSON.stringify(data.user));
    return data.user;
  } catch (e) {
    return rejectWithValue(errMsg(e));
  }
});

const slice = createSlice({
  name: 'auth',
  initialState: { user: savedUser(), token: localStorage.getItem('imovies_token'), loading: false },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('imovies_token');
      localStorage.removeItem('imovies_user');
    },
  },
  extraReducers: (b) => {
    [login, register].forEach((thunk) => {
      b.addCase(thunk.pending, (s) => { s.loading = true; });
      b.addCase(thunk.rejected, (s) => { s.loading = false; });
      b.addCase(thunk.fulfilled, (s, a) => {
        s.loading = false;
        s.user = a.payload.user;
        s.token = a.payload.token;
      });
    });
    b.addCase(fetchMe.fulfilled, (s, a) => { s.user = a.payload; });
  },
});

export const { logout } = slice.actions;
export default slice.reducer;
