import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, Compass, Home, PlusSquare } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username);
        } else {
          // Create user profile if it doesn't exist
          const newUsername = currentUser.email?.split('@')[0] || `user_${currentUser.uid.substring(0, 5)}`;
          await setDoc(doc(db, 'users', currentUser.uid), {
            uid: currentUser.uid,
            username: newUsername,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            createdAt: serverTimestamp()
          });
          setUsername(newUsername);
        }
      } else {
        setUsername(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tighter text-white">
          <span className="text-emerald-500">FUAD</span>CARDS
        </Link>
        
        <div className="flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
            <Home size={18} /> <span className="hidden sm:inline">Home</span>
          </Link>
          <Link to="/explore" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
            <Compass size={18} /> <span className="hidden sm:inline">Explore</span>
          </Link>
          
          {user ? (
            <>
              <Link to="/create" className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2">
                <PlusSquare size={18} /> <span className="hidden sm:inline">Create</span>
              </Link>
              <div className="h-6 w-px bg-white/10 mx-2"></div>
              <Link to={`/@${username}`} className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={18} />
                )}
                <span className="hidden sm:inline">{username}</span>
              </Link>
              <button onClick={handleLogout} className="text-zinc-500 hover:text-red-400 transition-colors p-2">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors"
            >
              <LogIn size={16} /> Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
