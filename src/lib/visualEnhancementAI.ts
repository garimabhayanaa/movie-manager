import { GoogleGenerativeAI } from '@google/generative-ai';
import { tmdb } from './tmdb';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface ColorProfile {
  movieId: number;
  dominantColors: string[];
  colorMood: string;
  colorTemperature: 'warm' | 'cool' | 'neutral';
  saturation: 'high' | 'medium' | 'low';
  brightness: 'dark' | 'medium' | 'bright';
  colorHarmony: string;
  emotionalAssociation: string[];
}

interface VisualStyle {
  cinematographyStyle: string;
  lightingStyle: string;
  colorGrading: string;
  composition: string;
  visualMotifs: string[];
  aestheticEra: string;
  influenceRating: number;
}

interface ColorRecommendation {
  movieId: number;
  title: string;
  colorSimilarity: number;
  visualMatch: string;
  moodAlignment: number;
  recommendation_reason: string;
}

export class VisualEnhancementAI {
  static async analyzeMovieColors(movieId: number): Promise<ColorProfile> {
    try {
      const movie = await tmdb.getMovie(movieId);
      
      // In real implementation, this would analyze actual movie frames/posters
      // For demo, we'll use AI to predict based on movie data
      const colorProfile = await this.predictColorProfile(movie);
      
      return {
        movieId,
        ...colorProfile
      };
    } catch (error) {
      console.error('Error analyzing movie colors:', error);
      throw error;
    }
  }

  private static async predictColorProfile(movie: any): Promise<Omit<ColorProfile, 'movieId'>> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Analyze the likely color profile for this movie based on its characteristics:

MOVIE: ${movie.title} (${new Date(movie.release_date).getFullYear()})
GENRES: ${movie.genres?.map(g => g.name).join(', ')}
PLOT: ${movie.overview}
RATING: ${movie.vote_average}/10

Based on genre conventions, plot themes, and cinematic traditions, predict the visual color profile:

{
  "dominantColors": ["#1a1a2e", "#16213e", "#e94560", "#f3a712"],
  "colorMood": "dramatic and intense",
  "colorTemperature": "cool",
  "saturation": "medium",
  "brightness": "dark",
  "colorHarmony": "complementary",
  "emotionalAssociation": ["tension", "mystery", "passion", "energy"]
}

Consider:
- Genre color conventions (horror = dark/red, comedy = bright/warm, sci-fi = blue/cold)
- Story mood and themes
- Character emotions and journey
- Setting and time period
- Directorial style trends
- Color psychology and audience impact

Use specific hex color codes for dominantColors.
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error parsing color profile:', parseError);
      return this.getFallbackColorProfile(movie);
    }
  }

  private static getFallbackColorProfile(movie: any): Omit<ColorProfile, 'movieId'> {
    // Simple fallback based on genre
    const genres = movie.genres?.map(g => g.name.toLowerCase()) || [];
    
    if (genres.includes('horror')) {
      return {
        dominantColors: ['#000000', '#8B0000', '#2F2F2F'],
        colorMood: 'dark and ominous',
        colorTemperature: 'cool',
        saturation: 'high',
        brightness: 'dark',
        colorHarmony: 'monochromatic',
        emotionalAssociation: ['fear', 'tension', 'mystery']
      };
    } else if (genres.includes('comedy')) {
      return {
        dominantColors: ['#FFD700', '#FF6347', '#87CEEB'],
        colorMood: 'bright and cheerful',
        colorTemperature: 'warm',
        saturation: 'high',
        brightness: 'bright',
        colorHarmony: 'triadic',
        emotionalAssociation: ['joy', 'energy', 'optimism']
      };
    } else {
      return {
        dominantColors: ['#4682B4', '#2F4F4F', '#D2691E'],
        colorMood: 'balanced and engaging',
        colorTemperature: 'neutral',
        saturation: 'medium',
        brightness: 'medium',
        colorHarmony: 'analogous',
        emotionalAssociation: ['interest', 'engagement', 'comfort']
      };
    }
  }

  // Get movies with similar color profiles
  static async getColorBasedRecommendations(
    referenceMovieId: number,
    userId: string,
    limit: number = 10
  ): Promise<ColorRecommendation[]> {
    try {
      const referenceColorProfile = await this.analyzeMovieColors(referenceMovieId);
      
      // Get candidate movies (in real app, from user's preferred genres/watchlist)
      const candidateMovies = await this.getCandidateMovies(userId);
      
      const recommendations: ColorRecommendation[] = [];
      
      for (const movie of candidateMovies.slice(0, 20)) {
        try {
          const movieColorProfile = await this.analyzeMovieColors(movie.id);
          const similarity = this.calculateColorSimilarity(referenceColorProfile, movieColorProfile);
          
          if (similarity > 0.6) { // Threshold for color similarity
            recommendations.push({
              movieId: movie.id,
              title: movie.title,
              colorSimilarity: similarity,
              visualMatch: this.getVisualMatchDescription(referenceColorProfile, movieColorProfile),
              moodAlignment: this.calculateMoodAlignment(referenceColorProfile, movieColorProfile),
              recommendation_reason: `Similar ${referenceColorProfile.colorMood} visual style`
            });
          }
        } catch (error) {
          console.error(`Error analyzing colors for movie ${movie.id}:`, error);
        }
      }
      
      return recommendations
        .sort((a, b) => b.colorSimilarity - a.colorSimilarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting color-based recommendations:', error);
      return [];
    }
  }

  private static calculateColorSimilarity(profile1: ColorProfile, profile2: ColorProfile): number {
    let similarity = 0;
    
    // Color temperature match
    if (profile1.colorTemperature === profile2.colorTemperature) similarity += 0.3;
    
    // Brightness match
    if (profile1.brightness === profile2.brightness) similarity += 0.2;
    
    // Saturation match
    if (profile1.saturation === profile2.saturation) similarity += 0.2;
    
    // Mood similarity
    const commonEmotions = profile1.emotionalAssociation.filter(emotion =>
      profile2.emotionalAssociation.includes(emotion)
    );
    similarity += (commonEmotions.length / Math.max(profile1.emotionalAssociation.length, 1)) * 0.3;
    
    return Math.min(similarity, 1);
  }

  private static calculateMoodAlignment(profile1: ColorProfile, profile2: ColorProfile): number {
    const commonEmotions = profile1.emotionalAssociation.filter(emotion =>
      profile2.emotionalAssociation.includes(emotion)
    );
    return commonEmotions.length / Math.max(profile1.emotionalAssociation.length, profile2.emotionalAssociation.length, 1);
  }

  private static getVisualMatchDescription(profile1: ColorProfile, profile2: ColorProfile): string {
    if (profile1.colorTemperature === profile2.colorTemperature && profile1.brightness === profile2.brightness) {
      return `Both feature ${profile1.colorTemperature} ${profile1.brightness} cinematography`;
    } else if (profile1.colorMood === profile2.colorMood) {
      return `Similar ${profile1.colorMood} visual atmosphere`;
    } else {
      return 'Complementary visual styles';
    }
  }

  // Analyze visual style trends
  static async analyzeVisualStyleTrends(movieIds: number[]): Promise<{
    trendingStyles: VisualStyle[];
    emergingTechniques: string[];
    colorTrends: string[];
    recommendedAdoption: string[];
  }> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // Analyze a sample of movies for patterns
    const movieData = await Promise.all(
      movieIds.slice(0, 10).map(id => tmdb.getMovie(id))
    );

    const prompt = `
Analyze visual style trends from these recent movies:

MOVIES: ${movieData.map(m => `${m.title} (${new Date(m.release_date).getFullYear()})`).join(', ')}
GENRES: ${[...new Set(movieData.flatMap(m => m.genres?.map(g => g.name) || []))].join(', ')}

Identify current visual trends in cinema:

{
  "trendingStyles": [
    {
      "cinematographyStyle": "Natural lighting with handheld cameras",
      "lightingStyle": "Soft, naturalistic lighting",
      "colorGrading": "Desaturated with teal/orange contrast",
      "composition": "Close-ups and medium shots",
      "visualMotifs": ["Reflection shots", "Symmetrical framing"],
      "aestheticEra": "Contemporary realism",
      "influenceRating": 8
    }
  ],
  "emergingTechniques": ["AI-enhanced color grading", "Virtual production", "HDR cinematography"],
  "colorTrends": ["Muted earth tones", "High contrast blacks", "Warm practical lighting"],
  "recommendedAdoption": ["Sustainable production methods", "Inclusive visual storytelling"]
}

Consider current filmmaking technology, audience preferences, and artistic movements.
Rate influence from 1-10 based on adoption and impact.
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error analyzing visual trends:', parseError);
      return {
        trendingStyles: [],
        emergingTechniques: ['Digital cinematography', 'Color grading innovations'],
        colorTrends: ['Natural tones', 'High contrast'],
        recommendedAdoption: ['Modern techniques', 'Audience-focused approaches']
      };
    }
  }

  // Generate mood-based color recommendations
  static async getMoodBasedColorRecommendations(
    mood: string,
    timeOfDay: string,
    weather?: string
  ): Promise<{
    recommendedColors: string[];
    movieSuggestions: any[];
    visualAtmosphere: string;
    reasoning: string;
  }> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Recommend movies based on color psychology for this context:

MOOD: ${mood}
TIME OF DAY: ${timeOfDay}
WEATHER: ${weather || 'unknown'}

Based on color psychology and mood enhancement, recommend:

{
  "recommendedColors": ["#warm_color", "#cool_color", "#neutral_color"],
  "movieSuggestions": [
    {"title": "Movie Title", "reason": "Color psychology match"}
  ],
  "visualAtmosphere": "Description of ideal visual mood",
  "reasoning": "Explanation of color psychology and mood matching"
}

Consider:
- How colors affect mood and emotion
- Time of day viewing preferences
- Weather impact on color preferences
- Cultural color associations
- Personal comfort and energy levels

Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error generating mood-based recommendations:', parseError);
      return {
        recommendedColors: ['#4682B4', '#D2691E', '#2F4F4F'],
        movieSuggestions: [],
        visualAtmosphere: 'Balanced and comfortable viewing',
        reasoning: 'Default color recommendations for general mood enhancement'
      };
    }
  }

  private static async getCandidateMovies(userId: string): Promise<any[]> {
    // Get popular movies or user's watchlist
    try {
      const response = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`);
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching candidate movies:', error);
      return [];
    }
  }
}
