import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Share2, Download } from 'lucide-react';

export const CardDetails = () => {
  const { cardId } = useParams<{ cardId: string }>();
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCard = async () => {
      if (!cardId) return;
      try {
        const docRef = doc(db, 'cards', cardId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setCard({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('Card not found');
        }
      } catch (err) {
        console.error("Error fetching card:", err);
        setError('Failed to load card');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCard();
  }, [cardId]);

  const handleDelete = async () => {
    if (!card || !auth.currentUser || auth.currentUser.uid !== card.authorId) return;
    
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await deleteDoc(doc(db, 'cards', card.id));
        navigate('/');
      } catch (err) {
        console.error("Error deleting card:", err);
        alert('Failed to delete card');
      }
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${card.characterName} AI Trading Card`,
        text: `Check out this AI trading card of ${card.characterName} from ${card.animeSource}!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  if (error || !card) {
    return <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
      <h1 className="text-2xl font-bold text-red-500 mb-4">{error || 'Card not found'}</h1>
      <Link to="/" className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors">
        <ArrowLeft size={20} /> Return Home
      </Link>
    </div>;
  }

  const isOwner = auth.currentUser?.uid === card.authorId;

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12">
      <Helmet>
        <title>{card.characterName} | FuadCards</title>
        <meta name="description" content={`AI Trading Card of ${card.characterName} from ${card.animeSource}. Power: ${card.pwr}, Strength: ${card.str}.`} />
        <meta property="og:title" content={`${card.characterName} | FuadCards`} />
        <meta property="og:description" content={`AI Trading Card of ${card.characterName} from ${card.animeSource}. Power: ${card.pwr}, Strength: ${card.str}.`} />
        <meta property="og:image" content={card.imageUrl} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={card.imageUrl} />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={20} /> Back
        </Link>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/20 border border-white/10 relative group">
              <img 
                src={card.imageUrl} 
                alt={`${card.characterName} from ${card.animeSource} AI Trading Card`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                <a 
                  href={card.imageUrl} 
                  download={`${card.characterName.replace(/\s+/g, '_')}_Card.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                  title="Download Image"
                >
                  <Download size={24} />
                </a>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-8"
          >
            <div>
              <h1 className="text-5xl font-bold tracking-tighter mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                {card.characterName}
              </h1>
              <p className="text-2xl text-emerald-400 font-medium">{card.animeSource}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900/50 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-zinc-500 text-sm font-bold tracking-widest mb-2">POWER</span>
                <span className="text-4xl font-mono font-bold text-white">{card.pwr}</span>
              </div>
              <div className="bg-zinc-900/50 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-zinc-500 text-sm font-bold tracking-widest mb-2">STRENGTH</span>
                <span className="text-4xl font-mono font-bold text-white">{card.str}</span>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-zinc-500 mb-4 uppercase tracking-wider">Card Details</h3>
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-zinc-400">Creator</dt>
                  <dd className="font-medium text-emerald-400">
                    <Link to={`/@${card.authorUsername}`} className="hover:underline">
                      @{card.authorUsername}
                    </Link>
                  </dd>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-zinc-400">Created</dt>
                  <dd className="text-zinc-300">
                    {card.createdAt?.toDate ? card.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-zinc-400">Visibility</dt>
                  <dd className="text-zinc-300">{card.isPublic ? 'Public' : 'Private'}</dd>
                </div>
              </dl>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-3 px-6 rounded-xl font-medium transition-colors"
              >
                <Share2 size={20} /> Share Card
              </button>
              
              {isOwner && (
                <button 
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white py-3 px-6 rounded-xl font-medium transition-colors border border-red-500/20"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
