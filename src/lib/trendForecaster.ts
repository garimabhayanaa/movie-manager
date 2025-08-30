import { GoogleGenerativeAI } from '@google/generative-ai';
import { database } from './database';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface TrendForecast {
  timestamp: Date;
  emergingGenres: {
    genre: string;
    growthRate: number;
    confidence: number;
    peakPrediction: Date;
    keyIndicators: string[];
  }[];
  seasonalTrends: {
    season: 'spring' | 'summer' | 'fall' | 'winter';
    recommendations: string[];
    moodShifts: string[];
  }[];
  culturalMoments: {
    event: string;
    relevantMovies: number[];
    timing: Date;
    impact: 'low' | 'medium' | 'high';
  }[];
  globalTrends: {
    region: string;
    popularGenres: string[];
    culturalFactors: string[];
  }[];
}

interface WeatherBasedRecommendation {
  weather: string;
  mood: string;
  recommendedGenres: string[];
  specificMovies: any[];
  reasoning: string;
}

export class AITrendForecaster {
  static async generateTrendForecast(): Promise<TrendForecast> {
    try {
      const currentData = await this.gatherTrendData();
      const forecast = await this.analyzeTrends(currentData);
      
      // Store forecast for future reference
      await this.storeForecast(forecast);
      
      return forecast;
    } catch (error) {
      console.error('Error generating trend forecast:', error);
      throw error;
    }
  }

  private static async gatherTrendData() {
    // In real implementation, gather from multiple sources
    return {
      currentDate: new Date(),
      recentMovies: await this.getRecentMovies(),
      socialMediaTrends: await this.getSocialMediaTrends(),
      newsEvents: await this.getCurrentEvents(),
      seasonalData: await this.getSeasonalData(),
      globalData: await this.getGlobalMovieData()
    };
  }

  private static async analyzeTrends(data: any): Promise<TrendForecast> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Analyze current movie and cultural trends to forecast emerging patterns:

CURRENT DATA:
- Date: ${data.currentDate.toISOString()}
- Recent Movies: ${JSON.stringify(data.recentMovies?.slice(0, 10))}
- Social Trends: ${JSON.stringify(data.socialMediaTrends)}
- Current Events: ${JSON.stringify(data.newsEvents)}
- Season: ${this.getCurrentSeason()}

Forecast trends in this exact JSON format:
{
  "timestamp": "${new Date().toISOString()}",
  "emergingGenres": [
    {
      "genre": "Climate Fiction",
      "growthRate": 0.25,
      "confidence": 0.8,
      "peakPrediction": "2025-12-01T00:00:00.000Z",
      "keyIndicators": ["Environmental awareness", "Youth engagement", "Award attention"]
    }
  ],
  "seasonalTrends": [
    {
      "season": "winter",
      "recommendations": ["Feel-good movies", "Family films", "Cozy dramas"],
      "moodShifts": ["Comfort seeking", "Nostalgia", "Indoor entertainment"]
    }
  ],
  "culturalMoments": [
    {
      "event": "Major sports event",
      "relevantMovies": [12345, 67890],
      "timing": "2025-09-15T00:00:00.000Z",
      "impact": "high"
    }
  ],
  "globalTrends": [
    {
      "region": "Asia-Pacific",
      "popularGenres": ["K-Drama", "Anime", "Action"],
      "culturalFactors": ["Streaming growth", "Youth culture", "Technology adoption"]
    }
  ]
}

Consider these factors:
- Current world events and their cultural impact
- Seasonal viewing patterns and mood changes
- Emerging social movements and generational shifts
- Technology trends affecting content consumption
- Global cultural exchanges and influences
- Historical patterns and cyclical trends

Focus on actionable predictions with clear reasoning.
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error parsing trend forecast:', parseError);
      return this.getFallbackForecast();
    }
  }

  private static getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private static getFallbackForecast(): TrendForecast {
    return {
      timestamp: new Date(),
      emergingGenres: [{
        genre: 'Tech Thriller',
        growthRate: 0.15,
        confidence: 0.7,
        peakPrediction: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        keyIndicators: ['AI advancement', 'Tech anxiety', 'Digital privacy concerns']
      }],
      seasonalTrends: [{
        season: this.getCurrentSeason() as any,
        recommendations: ['Seasonal favorites', 'Comfort viewing'],
        moodShifts: ['Weather-appropriate']
      }],
      culturalMoments: [],
      globalTrends: [{
        region: 'Global',
        popularGenres: ['Action', 'Comedy', 'Drama'],
        culturalFactors: ['Streaming growth', 'Global connectivity']
      }]
    };
  }

  // Weather-responsive recommendations
  static async getWeatherBasedRecommendations(
    location: string,
    userId: string
  ): Promise<WeatherBasedRecommendation> {
    try {
      const weatherData = await this.getWeatherData(location);
      const userPrefs = await database.getUserPreferences(userId);
      
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `
Generate movie recommendations based on current weather and user preferences:

WEATHER: ${JSON.stringify(weatherData)}
USER PREFERENCES: ${JSON.stringify(userPrefs)}
LOCATION: ${location}

Consider how weather affects viewing mood:
- Rainy/Storm: Cozy indoors, comfort films, thrillers
- Sunny: Light comedies, feel-good movies, adventures
- Cold: Warm stories, holiday films, intimate dramas
- Hot: Cool atmospheres, summer blockbusters, light entertainment
- Snow: Holiday classics, family films, romantic comedies

Provide recommendations in JSON format:
{
  "weather": "rainy",
  "mood": "cozy and contemplative",
  "recommendedGenres": ["Mystery", "Drama", "Romance"],
  "specificMovies": [
    {"title": "Movie Title", "reason": "Perfect for rainy day mood"}
  ],
  "reasoning": "Rainy weather creates perfect atmosphere for..."
}

Match the weather to appropriate movie moods and atmospheres.
Respond ONLY with valid JSON.
`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Error generating weather-based recommendations:', error);
      return {
        weather: 'unknown',
        mood: 'general',
        recommendedGenres: ['Comedy', 'Drama'],
        specificMovies: [],
        reasoning: 'General recommendations for any weather'
      };
    }
  }

  // Cultural moment matching
  static async getCulturalMomentRecommendations(event: string): Promise<any[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Recommend movies that are culturally relevant to this current event or moment:

EVENT/MOMENT: ${event}

Consider:
- Movies that relate to the theme or subject
- Films that capture similar emotions or experiences
- Historical parallels or contemporary relevance
- Movies that provide context or perspective
- Entertainment that matches the cultural mood

Provide specific movie recommendations with clear reasoning for relevance.
`;

    const result = await model.generateContent(prompt);
    return this.parseMovieRecommendations(result.response.text());
  }

  // Seasonal recommendation updates
  static async updateSeasonalRecommendations(): Promise<void> {
    const currentSeason = this.getCurrentSeason();
    const forecast = await this.generateTrendForecast();
    
    const seasonalTrend = forecast.seasonalTrends.find(t => t.season === currentSeason);
    
    if (seasonalTrend) {
      // Update recommendation engine with seasonal preferences
      await database.updateSeasonalRecommendations(currentSeason, {
        preferredGenres: seasonalTrend.recommendations,
        moodFactors: seasonalTrend.moodShifts,
        updatedAt: new Date()
      });
    }
  }

  private static async getRecentMovies() {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`);
      const data = await response.json();
      return data.results?.slice(0, 20) || [];
    } catch (error) {
      console.error('Error fetching recent movies:', error);
      return [];
    }
  }

  private static async getSocialMediaTrends(): Promise<string[]> {
    // Mock social media trends - in real app, integrate with social media APIs
    return ['AI technology', 'Climate change', 'Space exploration', 'Mental health awareness'];
  }

  private static async getCurrentEvents(): Promise<string[]> {
    // Mock current events - in real app, integrate with news APIs
    return ['Technology conferences', 'Film festivals', 'Cultural celebrations'];
  }

  private static async getSeasonalData() {
    return {
      season: this.getCurrentSeason(),
      temperature: 'moderate',
      holidays: this.getUpcomingHolidays()
    };
  }

  private static async getGlobalMovieData() {
    return {
      topRegions: ['North America', 'Europe', 'Asia-Pacific'],
      emergingMarkets: ['India', 'Brazil', 'Nigeria']
    };
  }

  private static async getWeatherData(location: string) {
    // Mock weather data - in real app, integrate with weather API
    return {
      condition: 'partly cloudy',
      temperature: 72,
      humidity: 60,
      season: this.getCurrentSeason()
    };
  }

  private static getUpcomingHolidays(): string[] {
    const now = new Date();
    const month = now.getMonth();
    
    if (month === 9) return ['Halloween'];
    if (month === 10) return ['Thanksgiving'];
    if (month === 11) return ['Christmas', 'New Year'];
    if (month === 0) return ['New Year'];
    if (month === 1) return ['Valentine\'s Day'];
    return [];
  }

  private static parseMovieRecommendations(text: string): any[] {
    // Simple parsing - in real implementation, use more sophisticated parsing
    const lines = text.split('\n').filter(line => line.trim());
    return lines.slice(0, 5).map((line, index) => ({
      id: `rec_${index}`,
      title: line.replace(/^\d+\.?\s*/, '').split('(')[0].trim(),
      reasoning: 'AI recommended based on cultural relevance'
    }));
  }

  private static async storeForecast(forecast: TrendForecast) {
    try {
      await database.storeTrendForecast(forecast);
    } catch (error) {
      console.error('Error storing trend forecast:', error);
    }
  }
}
