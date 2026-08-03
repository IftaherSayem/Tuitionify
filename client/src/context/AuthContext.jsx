import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null); // Firebase auth user
  const [profile, setProfile] = useState(null);           // Mongo profile (has role)
  const [restricted, setRestricted] = useState(false);    // banned by an admin
  const [loading, setLoading] = useState(true);

  // Try to load the Mongo profile for the logged-in Firebase user.
  // A 403 means the account is restricted; anything else means there is no
  // profile yet. The two look identical from the caller's side (profile stays
  // null) but lead to very different screens, so they are tracked apart.
  async function fetchProfile() {
    try {
      const { data } = await api.get('/users/me');
      setProfile(data);
      setRestricted(false);
      return data;
    } catch (err) {
      setProfile(null);
      setRestricted(err?.response?.status === 403);
      return null;
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchProfile();
      } else {
        setProfile(null);
        setRestricted(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Auth actions ─────────────────────────────────────────────
  async function signupEmail(name, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // non-fatal: account still created, user can resend later
    }
    return cred.user;
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  function resendVerification() {
    if (!auth.currentUser) throw new Error('Not logged in');
    return sendEmailVerification(auth.currentUser);
  }

  function loginEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function loginGoogle() {
    return signInWithPopup(auth, googleProvider);
  }

  function logout() {
    setProfile(null);
    setRestricted(false);
    return signOut(auth);
  }

  // Create the Mongo profile (called after signup with chosen role).
  async function registerProfile(payload) {
    try {
      const { data } = await api.post('/users/register', payload);
      setProfile(data);
      return data;
    } catch (err) {
      // The server repeats the ban check here, so surface it the same way.
      if (err?.response?.status === 403) setRestricted(true);
      throw err;
    }
  }

  async function refreshProfile() {
    return fetchProfile();
  }

  const value = {
    firebaseUser,
    profile,
    restricted,
    loading,
    isTutor: profile?.role === 'tutor',
    isSeeker: profile?.role === 'seeker',
    isAdmin: Boolean(profile?.isAdmin),
    signupEmail,
    loginEmail,
    loginGoogle,
    logout,
    registerProfile,
    refreshProfile,
    resetPassword,
    resendVerification,
    setProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
