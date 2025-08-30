import { GoogleGenerativeAI } from '@google/generative-ai';
import { tmdb } from './tmdb';
import { database } from './database';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface ContentAnalysis {
  microGenres: string[];
  contentWarnings: ContentWarning[];
  themes: string[];
  mood: string;
  complexity: number;
  visualStyle: string;
  pacing: string;
}

interface ContentWarning {
  type: 'violence' | 'language' | 'sexual_content' | 'substance_use' | 'disturbing_content' | 'flashing_lights';
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  timestamps?: string[];
}

export class AIContentAnalyzer {
  static async analyzeMovieContent(movieId: number): Promise<ContentAnalysis> {
    try {
      const movie = await tmdb.getMovie(movieId);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `
Analyze the movie "${movie.title}" (${movie.release_date?.split('-')[0]}) and provide detailed content analysis:

MOVIE INFO:
- Title: ${movie.title}
- Overview: ${movie.overview}
- Genres: ${movie.genres?.map(g => g.name).join(', ')}
- Rating: ${movie.vote_average}/10
- Runtime: ${movie.runtime} minutes

ANALYSIS REQUIRED:
1. MICRO-GENRES: Create 3-5 hyper-specific genre classifications beyond traditional categories
   Examples: "slow-burn psychological thriller", "feel-good coming-of-age comedy", "cerebral sci-fi drama"

2. CONTENT WARNINGS: Identify potential content warnings with severity levels
   Categories: violence, language, sexual_content, substance_use, disturbing_content, flashing_lights
   Severity: mild, moderate, severe

3. THEMES: Extract 5-7 major thematic elements

4. MOOD: Overall emotional tone (uplifting, dark, contemplative, energetic, etc.)

5. COMPLEXITY: Rate intellectual complexity 1-10 (1=simple entertainment, 10=requires deep thought)

6. VISUAL STYLE: Cinematography style (noir, vibrant, minimalist, epic, etc.)

7. PACING: Overall pacing (slow-burn, moderate, fast-paced, frenetic)

FORMAT AS JSON:
{
  "microGenres": ["genre1", "genre2", "genre3"],
  "contentWarnings": [
    {
      "type": "violence",
      "severity": "moderate",
      "description": "Action violence and fight scenes"
    }
  ],
  "themes": ["theme1", "theme2"],
  "mood": "mood_description",
  "complexity": 7,
  "visualStyle": "style_description",
  "pacing": "pacing_description"
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Store analysis in database
        await this.storeContentAnalysis(movieId, analysis);
        
        return analysis;
      }
      
      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('Error analyzing movie content:', error);
      return this.getFallbackAnalysis(movieId);
    }
  }

  static async storeContentAnalysis(movieId: number, analysis: ContentAnalysis) {
    try {
      await database.storeMovieAnalysis(movieId, {
        ...analysis,
        analyzedAt: new Date(),
        version: '1.0'
      });
    } catch (error) {
      console.error('Error storing content analysis:', error);
    }
  }

  static async getStoredAnalysis(movieId: number): Promise<ContentAnalysis | null> {
    try {
      return await database.getMovieAnalysis(movieId);
    } catch (error) {
      console.error('Error retrieving stored analysis:', error);
      return null;
    }
  }

  static async batchAnalyzePopularMovies(limit = 50) {
    try {
      const popular = await tmdb.getPopular();
      const movies = popular.results.slice(0, limit);
      
      for (const movie of movies) {
        const existing = await this.getStoredAnalysis(movie.id);
        if (!existing) {
          await this.analyzeMovieContent(movie.id);
          // Add delay to respect API rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error('Error in batch analysis:', error);
    }
  }

  private static getFallbackAnalysis(movieId: number): ContentAnalysis {
    return {
      microGenres: ['General Entertainment'],
      contentWarnings: [],
      themes: ['Entertainment', 'Storytelling'],
      mood: 'neutral',
      complexity: 5,
      visualStyle: 'standard',
      pacing: 'moderate'
    };
  }

  // Content warning matching for user preferences
  static filterByContentPreferences(
    movies: any[], 
    userPreferences: {
      avoidedContent: string[];
      maxSeverity: 'mild' | 'moderate' | 'severe';
    }
  ) {
    return movies.filter(async (movie) => {
      const analysis = await this.getStoredAnalysis(movie.id);
      if (!analysis) return true; // Allow if no analysis available
      
      return !analysis.contentWarnings.some(warning => 
        userPreferences.avoidedContent.includes(warning.type) &&
        this.severityLevel(warning.severity) > this.severityLevel(userPreferences.maxSeverity)
      );
    });
  }

  private static severityLevel(severity: string): number {
    const levels = { mild: 1, moderate: 2, severe: 3 };
    return levels[severity as keyof typeof levels] || 1;
  }
}
