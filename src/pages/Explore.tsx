import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import { MapPin, Loader2 } from 'lucide-react';

export const Explore = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<any[]>([]);
  const [findingStores, setFindingStores] = useState(false);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const q = query(
          collection(db, 'cards'),
          where('isPublic', '==', true),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const fetchedCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCards(fetchedCards);
      } catch (error) {
        console.error("Error fetching cards:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  const findLocalStores = async () => {
    setFindingStores(true);
    try {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        setFindingStores(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY });
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: "Find anime, manga, or trading card stores nearby.",
          config: {
            tools: [{ googleMaps: {} }],
            toolConfig: {
              retrievalConfig: {
                latLng: { latitude, longitude }
              }
            }
          }
        });

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          const places = chunks
            .filter((chunk: any) => chunk.maps?.uri)
            .map((chunk: any) => ({
              title: chunk.maps.title || 'Local Store',
              uri: chunk.maps.uri
            }));
          setStores(places);
        }
        setFindingStores(false);
      }, () => {
        alert("Unable to retrieve your location");
        setFindingStores(false);
      });
    } catch (err) {
      console.error("Error finding stores:", err);
      setFindingStores(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12">
      <Helmet>
        <title>Explore Gallery | FuadCards</title>
        <meta name="description" content="Explore the public gallery of AI-generated anime trading cards created by the FuadCards community." />
      </Helmet>

      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Public Gallery</h1>
            <p className="text-zinc-400">Discover the latest creations from the community.</p>
          </div>
          
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex flex-col items-start md:items-end">
            <p className="text-sm text-zinc-400 mb-2">Looking to buy physical cards?</p>
            <button 
              onClick={findLocalStores}
              disabled={findingStores}
              className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-emerald-500/20"
            >
              {findingStores ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />}
              Find Local Anime Stores
            </button>
            {stores.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 justify-end">
                {stores.map((store, i) => (
                  <a 
                    key={i} 
                    href={store.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-300 transition-colors"
                  >
                    {store.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {cards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
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
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
