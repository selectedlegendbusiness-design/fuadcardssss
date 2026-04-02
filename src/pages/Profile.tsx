import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { motion } from 'framer-motion';
import { User as UserIcon } from 'lucide-react';

export const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userCards, setUserCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!username) return;
      
      try {
        setLoading(true);
        // Clean username from @ if present
        const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
        
        // Fetch user profile
        const userQuery = query(collection(db, 'users'), where('username', '==', cleanUsername), limit(1));
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) {
          setError('User not found');
          setLoading(false);
          return;
        }
        
        const userData = { id: userSnapshot.docs[0].id, ...(userSnapshot.docs[0].data() as any) };
        setUserProfile(userData);
        
        // Fetch user's cards
        const isOwner = auth.currentUser?.uid === userData.uid;
        
        let cardsQuery;
        if (isOwner) {
          cardsQuery = query(
            collection(db, 'cards'),
            where('authorId', '==', userData.uid),
            orderBy('createdAt', 'desc')
          );
        } else {
          cardsQuery = query(
            collection(db, 'cards'),
            where('authorId', '==', userData.uid),
            where('isPublic', '==', true),
            orderBy('createdAt', 'desc')
          );
        }
        
        const cardsSnapshot = await getDocs(cardsQuery);
        const cards = cardsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setUserCards(cards);
        
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [username, auth.currentUser]);

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  if (error || !userProfile) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-2">{error || 'User not found'}</h1>
        <Link to="/" className="text-emerald-400 hover:underline">Return Home</Link>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12">
      <Helmet>
        <title>{userProfile.displayName || userProfile.username}'s Profile | FuadCards</title>
        <meta name="description" content={`View AI trading cards created by ${userProfile.username} on FuadCards.`} />
      </Helmet>

      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center mb-16">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-800 mb-6 border-4 border-zinc-800 shadow-xl">
            {userProfile.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500">
                <UserIcon size={48} />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{userProfile.displayName || userProfile.username}</h1>
          <p className="text-zinc-400">@{userProfile.username}</p>
          <div className="mt-6 flex gap-4 text-sm">
            <div className="bg-zinc-900 px-4 py-2 rounded-lg border border-white/5">
              <span className="text-emerald-400 font-bold">{userCards.length}</span> Cards Created
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-8 border-b border-white/10 pb-4">Collection</h2>

        {userCards.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-white/5">
            <p className="text-zinc-500">No cards found in this collection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {userCards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/post/${card.id}`} className="block group relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-emerald-500/50 transition-colors">
                  <img 
                    src={card.imageUrl} 
                    alt={`${card.characterName} from ${card.animeSource} AI Trading Card`} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-12">
                    <h3 className="text-sm font-bold text-white truncate">{card.characterName}</h3>
                    <p className="text-xs text-emerald-400 truncate">{card.animeSource}</p>
                  </div>
                  {!card.isPublic && (
                    <div className="absolute top-2 right-2 bg-black/80 text-xs px-2 py-1 rounded text-zinc-400 backdrop-blur-sm">
                      Private
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
