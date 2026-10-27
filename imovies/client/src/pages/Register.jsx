import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { register } from '../store/authSlice';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const dispatch = useDispatch();
  const nav = useNavigate();
  const loading = useSelector((s) => s.auth.loading);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    const { confirm, ...body } = form;
    const res = await dispatch(register(body));
    if (register.fulfilled.match(res)) {
      toast.success('Account created');
      nav('/', { replace: true });
    } else {
      toast.error(res.payload || 'Could not create account');
    }
  };

  return (
    <div className="container">
      <div className="ticket auth-card">
        <h1 className="h3 mb-3">Create your account</h1>
        <form onSubmit={submit} noValidate>
          <div className="mb-3"><label htmlFor="name" className="form-label">Full name</label>
            <input id="name" className="form-control" autoComplete="name" required value={form.name} onChange={set('name')} /></div>
          <div className="mb-3"><label htmlFor="email" className="form-label">Email</label>
            <input id="email" type="email" className="form-control" autoComplete="email" required value={form.email} onChange={set('email')} /></div>
          <div className="mb-3"><label htmlFor="phone" className="form-label">Phone (optional)</label>
            <input id="phone" type="tel" className="form-control" autoComplete="tel" value={form.phone} onChange={set('phone')} /></div>
          <div className="mb-3"><label htmlFor="password" className="form-label">Password</label>
            <input id="password" type="password" className="form-control" autoComplete="new-password" required value={form.password} onChange={set('password')} />
            <div className="form-text">At least 6 characters.</div></div>
          <div className="mb-3"><label htmlFor="confirm" className="form-label">Confirm password</label>
            <input id="confirm" type="password" className="form-control" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} /></div>
          <button className="btn btn-curtain w-100" disabled={loading || !form.name || !form.email || !form.password}>{loading ? 'Creating account' : 'Sign up'}</button>
        </form>
        <p className="meta mt-3 mb-0">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}
