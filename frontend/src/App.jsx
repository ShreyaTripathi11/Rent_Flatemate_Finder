import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Listings from './pages/Listings';
import ListingForm from './pages/ListingForm';
import ListingDetail from './pages/ListingDetail';
import Profile from './pages/Profile';
import Interests from './pages/Interests';
import Chat from './pages/Chat';
import Admin from './pages/Admin';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Listings />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/listings/:id" element={<ListingDetail />} />

        <Route
          path="/listings/new"
          element={
            <PrivateRoute roles={['owner']}>
              <ListingForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/listings/:id/edit"
          element={
            <PrivateRoute roles={['owner']}>
              <ListingForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute roles={['tenant']}>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/interests"
          element={
            <PrivateRoute roles={['tenant', 'owner']}>
              <Interests />
            </PrivateRoute>
          }
        />
        <Route
          path="/chat/:interestId"
          element={
            <PrivateRoute roles={['tenant', 'owner']}>
              <Chat />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute roles={['admin']}>
              <Admin />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}
