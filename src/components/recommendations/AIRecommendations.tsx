'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GeminiRecommendationEngine } from '@/lib/aiRecommendations';
import { Movie } from '@/types';
import { Sparkles, Brain, Target, Lightbulb, RefreshCw, Heart } from 'lucide-react';
import Link from 'next/link';
import { tmdb } from '@/lib/tmdb';
import RecommendationCard from './RecommendationCard';

interface AIRecommendation {
  movie: Movie;
  confidence: number;
  reasoning: string;
  matchFactors: string[];
}

const AIRecommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContext, setSelectedContext] = useState<string>('general');
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user, selectedContext]);

  const loadRecommendations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let recs: AIRecommendation[] = [];
      
      if (selectedContext === 'general') {
        recs = await GeminiRecommendationEngine.generatePersonalizedRecommendations({
          userId: user.uid,
          limit: 12
        });
      } else if (selectedContext === 'custom' && customPrompt) {
        recs = await GeminiRecommendationEngine.generatePersonalizedRecommendations({
          userId: user.uid,
          context: customPrompt,
          limit: 12
        });
      } else {
        recs = await GeminiRecommendationEngine.getContextualRecommendations(
          user.uid, 
          selectedContext as any
        );
      }
      
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading AI recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomPrompt = async () => {
    if (!customPrompt.trim()) return;
    setSelectedContext('custom');
    await loadRecommendations();
  };

  const contexts = [
    { key: 'general', label: 'For You', icon: Sparkles, description: 'Personalized picks based on your taste' },
    { key: 'date_night', label: 'Date Night', icon: Heart, description: 'Perfect movies for couples' },
    { key: 'family_time', label: 'Family Time', icon: Users, description: 'Movies everyone can enjoy' },
    { key: 'solo_binge', label: 'Solo Watch', icon: Target, description: 'Engaging solo viewing' },
    { key: 'weekend_marathon', label: 'Marathon', icon: Brain, description: 'Binge-worthy series' },
  ];

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          AI-Powered Recommendations
        </h3>
        <p className="text-gray-600 mb-6">
          Sign in to get personalized movie recommendations powered by Gemini AI
        </p>
        <Link
          href="/auth/login"
          className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
        >
          Sign In to Get Started
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">AI Recommendations</h1>
        </div>
        <p className="text-gray-600">
          Personalized movie suggestions powered by Google Gemini AI
        </p>
      </div>

      {/* Context Selection */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">What are you in the mood for?</h3>
        
        {/* Context Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {contexts.map(({ key, label, icon: Icon, description }) => (
            <button
              key={key}
              onClick={() => setSelectedContext(key)}
              className={`p-4 rounded-lg border-2 transition text-left ${
                selectedContext === key
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className={`h-5 w-5 mb-2 ${
                selectedContext === key ? 'text-primary' : 'text-gray-500'
              }`} />
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs text-gray-500 mt-1">{description}</div>
            </button>
          ))}
        </div>

        {/* Custom Prompt */}
        <div className="flex space-x-3">
          <div className="flex-1">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe what you want to watch... (e.g., 'mind-bending sci-fi movies like Inception')"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleCustomPrompt()}
            />
          </div>
          <button
            onClick={handleCustomPrompt}
            disabled={!customPrompt.trim() || loading}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-secondary transition disabled:opacity-50"
          >
            <Lightbulb className="h-4 w-4" />
          </button>
          <button
            onClick={loadRecommendations}
            disabled={loading}
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* AI Insights */}
      {recommendations.length > 0 && recommendations[0].reasoning && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
          <div className="flex items-start space-x-3">
            <Brain className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-900 mb-2">AI Reasoning</h3>
              <p className="text-purple-800">{recommendations[0].reasoning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-300 aspect-[2/3] rounded-lg"></div>
              <div className="bg-gray-300 h-4 rounded mt-2"></div>
              <div className="bg-gray-300 h-3 rounded mt-1"></div>
            </div>
          ))}
        </div>
      ) : recommendations.length > 0 ? (
        <div className="space-y-8">
          {/* High Confidence Recommendations */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Perfect Matches</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {recommendations
                .filter(rec => rec.confidence >= 80)
                .map((rec) => (
                  <div key={rec.movie.id} className="relative">
                    <RecommendationCard
                      movie={rec.movie}
                      size="sm"
                    />
                    <div className="absolute top-2 right-2">
                      <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        {Math.round(rec.confidence)}%
                      </div>
                    </div>
                    {rec.matchFactors.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-600">
                          {rec.matchFactors[0]}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Good Matches */}
          {recommendations.filter(rec => rec.confidence < 80 && rec.confidence >= 60).length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Great Picks</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {recommendations
                  .filter(rec => rec.confidence < 80 && rec.confidence >= 60)
                  .map((rec) => (
                    <div key={rec.movie.id} className="relative">
                      <RecommendationCard
                        movie={rec.movie}
                        size="sm"
                      />
                      <div className="absolute top-2 right-2">
                        <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                          {Math.round(rec.confidence)}%
                        </div>
                      </div>
                      {rec.matchFactors.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-600">
                            {rec.matchFactors[0]}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Worth Exploring */}
          {recommendations.filter(rec => rec.confidence < 60).length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Worth Exploring</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {recommendations
                  .filter(rec => rec.confidence < 60)
                  .map((rec) => (
                    <div key={rec.movie.id} className="relative opacity-90">
                      <RecommendationCard
                        movie={rec.movie}
                        size="sm"
                      />
                      <div className="absolute top-2 right-2">
                        <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                          {Math.round(rec.confidence)}%
                        </div>
                      </div>
                      {rec.matchFactors.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-600">
                            {rec.matchFactors[0]}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Recommendations Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Watch a few movies and rate them to get personalized AI recommendations
          </p>
          <Link
            href="/discover"
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
          >
            Start Watching Movies
          </Link>
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;
