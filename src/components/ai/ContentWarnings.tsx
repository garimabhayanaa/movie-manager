'use client';

import { useState, useEffect } from 'react';
import { AIContentAnalyzer } from '@/lib/aiContentAnalysis';
import { 
  AlertTriangle, 
  Eye, 
  Volume2, 
  Heart, 
  Pill,
  Brain,
  Zap,
  Info
} from 'lucide-react';

interface ContentWarningsProps {
  movieId: number;
}

const ContentWarnings = ({ movieId }: ContentWarningsProps) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadContentAnalysis();
  }, [movieId]);

  const loadContentAnalysis = async () => {
    try {
      let analysis = await AIContentAnalyzer.getStoredAnalysis(movieId);
      
      if (!analysis) {
        analysis = await AIContentAnalyzer.analyzeMovieContent(movieId);
      }
      
      setAnalysis(analysis);
    } catch (error) {
      console.error('Error loading content analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWarningIcon = (type: string) => {
    const icons = {
      violence: AlertTriangle,
      language: Volume2,
      sexual_content: Heart,
      substance_use: Pill,
      disturbing_content: Brain,
      flashing_lights: Zap,
    };
    return icons[type as keyof typeof icons] || Info;
  };

  const getSeverityColor = (severity: string) => {
    return {
      mild: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      moderate: 'text-orange-600 bg-orange-50 border-orange-200',
      severe: 'text-red-600 bg-red-50 border-red-200'
    }[severity] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-300 h-4 w-32 rounded"></div>
          <div className="space-y-2">
            <div className="bg-gray-300 h-3 rounded"></div>
            <div className="bg-gray-300 h-3 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">AI Content Analysis</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-primary hover:text-secondary text-sm"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Micro Genres */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2">Smart Genre Classification</h4>
        <div className="flex flex-wrap gap-2">
          {analysis.microGenres.map((genre: string, index: number) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      {/* Content Warnings */}
      {analysis.contentWarnings.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
            Content Warnings
          </h4>
          <div className="space-y-2">
            {analysis.contentWarnings.map((warning: any, index: number) => {
              const Icon = getWarningIcon(warning.type);
              return (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${getSeverityColor(warning.severity)}`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {warning.type.replace('_', ' ')} ({warning.severity})
                    </div>
                    <div className="text-sm opacity-90">
                      {warning.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional Details */}
      {showDetails && (
        <div className="space-y-4 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Mood & Style</h5>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Mood: <span className="font-medium">{analysis.mood}</span></div>
                <div>Visual Style: <span className="font-medium">{analysis.visualStyle}</span></div>
                <div>Pacing: <span className="font-medium">{analysis.pacing}</span></div>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Complexity</h5>
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-4 rounded-sm ${
                        i < analysis.complexity ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {analysis.complexity}/10
                </span>
              </div>
            </div>
          </div>

          {/* Themes */}
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Major Themes</h5>
            <div className="flex flex-wrap gap-2">
              {analysis.themes.map((theme: string, index: number) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentWarnings;
