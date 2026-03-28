'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import AuthContext from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  const linkClass =
    'rounded-full px-3 py-1.5 text-sm font-medium text-white/85 transition hover:bg-white/15 hover:text-white';

  return (
    <nav className="fixed top-0 left-0 z-30 w-full px-4 pt-4 text-white sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between rounded-2xl border border-white/20 bg-black/35 px-4 py-3 backdrop-blur-md">
        <div>
          <Link href="/" className="text-xl font-bold tracking-wide text-white hover:text-primary sm:text-2xl">
            TravelCo
          </Link>
        </div>
        <ul className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <li>
                <Link href="/dashboard" className={linkClass}>Dashboard</Link>
              </li>
              <li>
                <Link href="/destinations" className={linkClass}>Destinations</Link>
              </li>
              <li>
                <Link href="/hotels" className={linkClass}>Hotels</Link>
              </li>
              <li>
                <button onClick={logout} className={linkClass}>Logout</button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link href="/" className={linkClass}>Home</Link>
              </li>
              <li>
                <Link href="/login" className={linkClass}>Login</Link>
              </li>
              <li>
                <Link href="/register" className={linkClass}>Register</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
