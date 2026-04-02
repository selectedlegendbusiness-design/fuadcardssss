import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export const Home = () => {
  const [recentCards, setRecentCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const q = query(
          collection(db, 'cards'),
          where('isPublic', '==', true),
          orderBy('createdAt', 'desc'),
          limit(12)
        );
        const snapshot = await getDocs(q);
        const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentCards(cards);
      } catch (error) {
        console.error("Error fetching recent cards:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Helmet>
        <title>FuadCards | AI Trading Card Generator</title>
        <meta name="description" content="Generate aesthetic, high-quality anime trading cards using AI. Create, collect, and share your custom cards with the world." />
        <meta property="og:title" content="FuadCards | AI Trading Card Generator" />
        <meta property="og:description" content="Generate aesthetic, high-quality anime trading cards using AI." />
        <meta property="og:type" content="website" />
      </Helmet>

      <main className="container mx-auto px-4 py-16">
        <section className="text-center mb-24">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent"
          >
            Forge Your Legend
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10"
          >
            Create stunning, full-bleed AI trading cards with dynamic stats and unique QR codes.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/create" className="inline-flex items-center justify-center px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
              Start Generating
            </Link>
          </motion.div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Recent Discoveries</h2>
            <Link to="/explore" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
              View All &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {recentCards.map((card, i) => (
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <h3 className="text-lg font-bold text-white truncate">{card.characterName}</h3>
                      <p className="text-sm text-emerald-400 truncate">{card.animeSource}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-zinc-400">
                        <span>PWR: {card.pwr}</span>
                        <span>STR: {card.str}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
