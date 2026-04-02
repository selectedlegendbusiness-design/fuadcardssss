import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { uploadImageToR2 } from '../lib/cloudflare';
import { CardCanvas } from '../components/CardCanvas';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { motion } from 'framer-motion';
import { Wand2, Loader2, Upload, Search } from 'lucide-react';

export const Create = () => {
  const [characterName, setCharacterName] = useState('');
  const [animeSource, setAnimeSource] = useState('');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedData, setGeneratedData] = useState<{
    imageUrl: string;
    pwr: number;
    str: number;
  } | null>(null);
  
  const [finalBlob, setFinalBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY });
        
        const prompt = `Analyze this image of an anime character. Identify the character's name and the anime they are from. Also, provide a short visual prompt describing their appearance in this image. Return ONLY a JSON object with keys: "characterName", "animeSource", and "visualPrompt".`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType: file.type } }
            ]
          },
          config: {
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
          }
        });

        try {
          const result = JSON.parse(response.text || '{}');
          if (result.characterName) setCharacterName(result.characterName);
          if (result.animeSource) setAnimeSource(result.animeSource);
          if (result.visualPrompt) setVisualPrompt(result.visualPrompt);
        } catch (parseErr) {
          console.error("Failed to parse analysis result", parseErr);
          setError("Failed to analyze image correctly.");
        }
        setIsAnalyzing(false);
      };
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError("Failed to analyze image.");
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError('You must be logged in to create a card.');
      return;
    }
    
    const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map((e: string) => e.trim().toLowerCase()) || [];
    const userEmail = auth.currentUser.email?.toLowerCase();
    if (adminEmails.length > 0 && (!userEmail || !adminEmails.includes(userEmail))) {
      setError('Only authorized administrators can create cards.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedData(null);
    setFinalBlob(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY });

      const statsPrompt = `Generate RPG stats for the character "${characterName}" from "${animeSource}".
      Return ONLY a JSON object with two keys: "pwr" (number 0-9999) and "str" (number 0-9999).`;
      
      const statsResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: statsPrompt,
        config: {
          responseMimeType: 'application/json',
        }
      });
      
      let pwr = Math.floor(Math.random() * 9000) + 1000;
      let str = Math.floor(Math.random() * 9000) + 1000;
      
      try {
        const stats = JSON.parse(statsResponse.text || '{}');
        if (stats.pwr) pwr = stats.pwr;
        if (stats.str) str = stats.str;
      } catch (e) {
        console.warn("Failed to parse stats, using random", e);
      }

      const imagePrompt = `A high quality, full body portrait of ${characterName} from ${animeSource}. ${visualPrompt}. Anime style, dynamic pose, highly detailed, masterpiece.`;
      
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: imagePrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4",
            imageSize: "1K"
          }
        }
      });

      let base64Image = '';
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!base64Image) {
        throw new Error("Failed to generate image. Please try again.");
      }

      setGeneratedData({
        imageUrl: base64Image,
        pwr,
        str
      });

      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'Generation',
          character: characterName,
          anime: animeSource
        });
      }

    } catch (err: any) {
      console.error("Generation Error:", err);
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!finalBlob || !generatedData || !auth.currentUser) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const username = userDoc.exists() ? userDoc.data().username : 'Unknown';

      const filename = `cards/${auth.currentUser.uid}_${Date.now()}.jpg`;
      const uploadedUrl = await uploadImageToR2(finalBlob, filename);

      const cardData = {
        authorId: auth.currentUser.uid,
        authorUsername: username,
        characterName,
        animeSource,
        imageUrl: uploadedUrl,
        pwr: generatedData.pwr,
        str: generatedData.str,
        prompt: visualPrompt,
        createdAt: serverTimestamp(),
        isPublic
      };

      const docRef = await addDoc(collection(db, 'cards'), cardData);

      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'Card Save',
          cardId: docRef.id
        });
      }

      navigate(`/post/${docRef.id}`);
    } catch (err: any) {
      console.error("Save Error:", err);
      setError("Failed to save card. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12">
      <Helmet>
        <title>Create Card | FuadCards</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold tracking-tight mb-8">Forge a New Card</h1>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Form Section */}
          <div className="space-y-6">
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Search size={20} className="text-emerald-500" /> Auto-Fill with Image
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                Upload an image of a character to automatically extract their name, anime, and appearance.
              </p>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? <><Loader2 className="animate-spin" size={18} /> Analyzing Image...</> : <><Upload size={18} /> Upload Image to Analyze</>}
              </button>
            </div>

            <form onSubmit={handleGenerate} className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Character Name</label>
                <input
                  type="text"
                  required
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. Goku"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Anime Source</label>
                <input
                  type="text"
                  required
                  value={animeSource}
                  onChange={(e) => setAnimeSource(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. Dragon Ball Z"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Visual Prompt (Optional)</label>
                <textarea
                  value={visualPrompt}
                  onChange={(e) => setVisualPrompt(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors h-24 resize-none"
                  placeholder="Describe the pose, setting, or specific details..."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded border-white/10 bg-black/50 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                />
                <label htmlFor="isPublic" className="text-sm text-zinc-300">
                  Make this card public in the gallery
                </label>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating || !auth.currentUser}
                className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <><Loader2 className="animate-spin" size={20} /> Forging...</>
                ) : (
                  <><Wand2 size={20} /> Generate Card</>
                )}
              </button>
            </form>
          </div>

          {/* Preview Section */}
          <div className="flex flex-col items-center justify-center bg-zinc-900/20 rounded-3xl border border-white/5 p-8 min-h-[600px]">
            {generatedData ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center"
              >
                <CardCanvas
                  imageUrl={generatedData.imageUrl}
                  pwr={generatedData.pwr}
                  str={generatedData.str}
                  characterName={characterName}
                  animeSource={animeSource}
                  cardUrl={`${import.meta.env.VITE_APP_URL || window.location.origin}/post/preview`}
                  onCanvasReady={(blob) => setFinalBlob(blob)}
                />
                
                <button
                  onClick={handleSave}
                  disabled={!finalBlob || isSaving}
                  className="mt-8 w-full max-w-sm py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <><Loader2 className="animate-spin" size={20} /> Saving to Vault...</>
                  ) : (
                    'Save Card'
                  )}
                </button>
              </motion.div>
            ) : (
              <div className="text-center text-zinc-500">
                <Wand2 size={48} className="mx-auto mb-4 opacity-20" />
                <p>Your generated card will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
