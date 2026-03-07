'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import AuthContext from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="fixed top-0 left-0 w-full z-20 bg-transparent text-white">
      <div className="container mx-auto flex justify-between items-center p-4">
        <div>
          <Link href="/" className="text-2xl font-bold hover:text-primary">
            TravelCo
          </Link>
        </div>
        <ul className="flex items-center">
          <li className="ml-4">
            <Link href="/" className="hover:text-primary">Home</Link>
          </li>
          <li className="ml-4">
            <Link href="/destinations" className="hover:text-primary">Destinations</Link>
          </li>
          <li className="ml-4">
            <Link href="/hotels" className="hover:text-primary">Hotels</Link>
          </li>
          {user ? (
            <>
              <li className="ml-4">
                <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
              </li>
              <li className="ml-4">
                <button onClick={logout} className="hover:text-primary">Logout</button>
              </li>
            </>
          ) : (
            <>
              <li className="ml-4">
                <Link href="/login" className="hover:text-primary">Login</Link>
              </li>
              <li className="ml-4">
                <Link href="/register" className="hover:text-primary">Register</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
