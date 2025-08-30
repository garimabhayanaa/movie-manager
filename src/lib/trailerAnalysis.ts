import { GoogleGenerativeAI } from '@google/generative-ai';
import { tmdb } from './tmdb';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface TrailerAnalysis {
  emotions: EmotionData[];
  pacing: 'slow' | 'moderate' | 'fast' | 'variable';
  highlights: string[];
  spoilerRisk: 'low' | 'medium' | 'high';
  targetMood: string[];
  visualElements: string[];
  musicStyle: string;
  peakMoments: number[];
}

interface EmotionData {
  emotion: string;
  intensity: number;
  timestamp: string;
  confidence: number;
}

export class TrailerAnalyzer {
  static async analyzeTrailer(movieId: number, trailerUrl: string): Promise<TrailerAnalysis> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      
      const prompt = `
Analyze this movie trailer and provide detailed emotional and content analysis:

TRAILER URL: ${trailerUrl}
MOVIE ID: ${movieId}

Based on typical trailer patterns for this type of content, analyze:

1. EMOTIONAL JOURNEY: Identify 5-8 key emotional beats throughout the trailer
   - Map emotions like: excitement, tension, fear, joy, sadness, wonder, anger, romance
   - Rate intensity 1-10
   - Estimate timestamp positions (0-100%)

2. PACING ANALYSIS: Overall pacing style

3. HIGHLIGHTS: 3-5 most compelling moments that would attract viewers

4. SPOILER RISK: Assess how much the trailer reveals (low/medium/high)

5. TARGET MOOD: What viewer moods would this trailer appeal to?

6. VISUAL ELEMENTS: Dominant visual styles and techniques

7. MUSIC STYLE: Background music and audio style

8. PEAK MOMENTS: Timestamp percentages of highest intensity moments

FORMAT AS JSON:
{
  "emotions": [
    {
      "emotion": "excitement",
      "intensity": 8,
      "timestamp": "15%",
      "confidence": 0.9
    }
  ],
  "pacing": "fast",
  "highlights": ["highlight1", "highlight2"],
  "spoilerRisk": "medium",
  "targetMood": ["mood1", "mood2"],
  "visualElements": ["element1", "element2"],
  "musicStyle": "epic orchestral",
  "peakMoments": [25, 60, 85]
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Store analysis
        await this.storeTrailerAnalysis(movieId, analysis);
        
        return analysis;
      }
      
      throw new Error('Failed to parse trailer analysis');
    } catch (error) {
      console.error('Error analyzing trailer:', error);
      return this.getFallbackTrailerAnalysis();
    }
  }

  static async getTrailerRecommendationsByMood(
    userId: string, 
    targetMood: string
  ): Promise<any[]> {
    try {
      // Get user's movie preferences
      const userMovies = await database.getUserMovies(userId);
      
      // Find trailers that match the target mood
      const matchingTrailers = await database.getTrailersByMood(targetMood);
      
      return matchingTrailers.slice(0, 10);
    } catch (error) {
      console.error('Error getting mood-based trailer recommendations:', error);
      return [];
    }
  }

  static async generatePersonalizedTrailerCut(
    movieId: number, 
    userPreferences: any
  ): Promise<{segments: any[], reasoning: string}> {
    try {
      const trailerAnalysis = await this.getTrailerAnalysis(movieId);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `
Create a personalized trailer cut based on user preferences:

TRAILER ANALYSIS: ${JSON.stringify(trailerAnalysis)}
USER PREFERENCES: ${JSON.stringify(userPreferences)}

Generate a custom trailer sequence that:
1. Highlights elements the user loves most
2. Minimizes content they tend to avoid
3. Matches their preferred pacing and emotional journey

Return segments with timestamps and reasoning.
`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      return {
        segments: [], // Would parse from AI response
        reasoning: response
      };
    } catch (error) {
      console.error('Error generating personalized trailer:', error);
      return { segments: [], reasoning: 'Error generating custom trailer' };
    }
  }

  private static async storeTrailerAnalysis(movieId: number, analysis: TrailerAnalysis) {
    try {
      await database.storeTrailerAnalysis(movieId, {
        ...analysis,
        analyzedAt: new Date()
      });
    } catch (error) {
      console.error('Error storing trailer analysis:', error);
    }
  }

  private static async getTrailerAnalysis(movieId: number): Promise<TrailerAnalysis | null> {
    try {
      return await database.getTrailerAnalysis(movieId);
    } catch (error) {
      console.error('Error retrieving trailer analysis:', error);
      return null;
    }
  }

  private static getFallbackTrailerAnalysis(): TrailerAnalysis {
    return {
      emotions: [
        { emotion: 'excitement', intensity: 6, timestamp: '50%', confidence: 0.7 }
      ],
      pacing: 'moderate',
      highlights: ['Great visuals', 'Compelling story'],
      spoilerRisk: 'medium',
      targetMood: ['entertainment', 'casual viewing'],
      visualElements: ['standard cinematography'],
      musicStyle: 'background score',
      peakMoments: [25, 75]
    };
  }
}
