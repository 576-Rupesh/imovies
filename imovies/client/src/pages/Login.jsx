import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { login } from '../store/authSlice';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const dispatch = useDispatch();
  const nav = useNavigate();
  const location = useLocation();
  const loading = useSelector((s) => s.auth.loading);

  const submit = async (e) => {
    e.preventDefault();
    const res = await dispatch(login(form));
    if (login.fulfilled.match(res)) {
      toast.success(`Welcome back, ${res.payload.user.name.split(' ')[0]}`);
      nav(location.state?.from || (res.payload.user.role === 'admin' ? '/admin' : '/'), { replace: true });
    } else {
      toast.error(res.payload || 'Could not log in');
    }
  };

  return (
    <div className="container">
      <div className="ticket auth-card">
        <h1 className="h3 mb-3">Log in</h1>
        <form onSubmit={submit} noValidate>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input id="email" type="email" className="form-control" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <input id="password" type="password" className="form-control" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn btn-curtain w-100" disabled={loading || !form.email || !form.password}>{loading ? 'Logging in' : 'Log in'}</button>
        </form>
        <p className="meta mt-3 mb-0">New here? <Link to="/register">Create an account</Link></p>
        <p className="meta mt-2 mb-0">Demo: user@imovies.com / User@123, admin@imovies.com / Admin@123</p>
      </div>
    </div>
  );
}
