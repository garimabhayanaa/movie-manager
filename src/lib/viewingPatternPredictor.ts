import { GoogleGenerativeAI } from '@google/generative-ai';
import { database } from './database';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface ViewingPattern {
  userId: string;
  patterns: {
    preferredTimes: { [hour: number]: number }; // Hour of day -> frequency
    weekdayPreferences: { [day: string]: number };
    sessionLengths: number[]; // Minutes per session
    bingeThreshold: number; // Minutes that constitute a binge
    averageRating: number;
    genresByTime: { [timeSlot: string]: string[] };
    moodByTime: { [timeSlot: string]: string };
  };
  predictions: {
    nextWatchTime: Date;
    likelyToFinish: number; // 0-1 probability
    bingeRisk: number; // 0-1 probability of binge-watching
    optimalSessionLength: number;
    recommendedGenres: string[];
  };
  analysisDate: Date;
}

interface BingePredictor {
  movieId: number;
  bingeScore: number; // 0-1 probability of leading to binge
  factors: string[];
  similarMovies: number[];
  warningFactors: string[];
}

export class ViewingPatternPredictor {
  static async analyzeUserPatterns(userId: string): Promise<ViewingPattern> {
    try {
      const userMovies = await database.getUserMovies(userId);
      const userActivities = await database.getActivities(userId, 100);
      
      const patterns = await this.extractViewingPatterns(userMovies, userActivities);
      const predictions = await this.generatePredictions(patterns, userId);
      
      return {
        userId,
        patterns,
        predictions,
        analysisDate: new Date()
      };
    } catch (error) {
      console.error('Error analyzing viewing patterns:', error);
      throw error;
    }
  }

  private static async extractViewingPatterns(userMovies: any[], activities: any[]): Promise<ViewingPattern['patterns']> {
    const preferredTimes: { [hour: number]: number } = {};
    const weekdayPreferences: { [day: string]: number } = {};
    const sessionLengths: number[] = [];
    const genresByTime: { [timeSlot: string]: string[] } = {};
    const moodByTime: { [timeSlot: string]: string } = {};

    // Analyze watching times
    userMovies.forEach(movie => {
      if (movie.watchedDate) {
        const date = new Date(movie.watchedDate);
        const hour = date.getHours();
        const day = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        preferredTimes[hour] = (preferredTimes[hour] || 0) + 1;
        weekdayPreferences[day] = (weekdayPreferences[day] || 0) + 1;
        
        // Determine time slot
        const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
        
        if (!genresByTime[timeSlot]) genresByTime[timeSlot] = [];
        // Would add actual genres here
      }
    });

    // Calculate average session length (simplified)
    const avgSessionLength = 120; // Would calculate from actual data
    sessionLengths.push(avgSessionLength);

    // Calculate average rating
    const ratedMovies = userMovies.filter(m => m.rating);
    const averageRating = ratedMovies.length > 0 
      ? ratedMovies.reduce((sum, m) => sum + m.rating, 0) / ratedMovies.length 
      : 3.5;

    return {
      preferredTimes,
      weekdayPreferences,
      sessionLengths,
      bingeThreshold: avgSessionLength * 2, // 2x normal session = binge
      averageRating,
      genresByTime,
      moodByTime: {
        morning: 'energetic',
        afternoon: 'casual',
        evening: 'relaxed',
        night: 'focused'
      }
    };
  }

  private static async generatePredictions(patterns: ViewingPattern['patterns'], userId: string): Promise<ViewingPattern['predictions']> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Analyze this user's viewing patterns and make predictions:

PATTERNS: ${JSON.stringify(patterns, null, 2)}

Based on these patterns, predict:
1. When they're most likely to watch next (next optimal time)
2. Probability they'll finish movies they start (0-1)
3. Risk of binge-watching sessions (0-1)
4. Optimal session length for recommendations
5. Best genres to recommend for different times

Consider:
- Their most active viewing times
- Historical completion rates
- Session length trends
- Genre preferences by time of day

Provide predictions in JSON format:
{
  "nextWatchTime": "2025-08-30T20:00:00.000Z",
  "likelyToFinish": 0.8,
  "bingeRisk": 0.6,
  "optimalSessionLength": 120,
  "recommendedGenres": ["Action", "Comedy"]
}

Base predictions on actual pattern analysis, not generic assumptions.
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      const predictions = JSON.parse(cleanResponse);
      
      // Ensure nextWatchTime is a proper Date
      predictions.nextWatchTime = new Date(predictions.nextWatchTime);
      
      return predictions;
    } catch (parseError) {
      console.error('Error parsing viewing predictions:', parseError);
      return this.getFallbackPredictions();
    }
  }

  private static getFallbackPredictions(): ViewingPattern['predictions'] {
    const now = new Date();
    const nextWatchTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    nextWatchTime.setHours(20, 0, 0, 0); // 8 PM

    return {
      nextWatchTime,
      likelyToFinish: 0.7,
      bingeRisk: 0.5,
      optimalSessionLength: 120,
      recommendedGenres: ['Drama', 'Action']
    };
  }

  // Predict if a movie will lead to binge-watching
  static async predictBingeRisk(movieId: number, userId: string): Promise<BingePredictor> {
    try {
      const userPatterns = await this.analyzeUserPatterns(userId);
      const movieData = await this.getMovieData(movieId);
      
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `
Predict binge-watching risk for this movie and user:

USER PATTERNS: ${JSON.stringify(userPatterns.patterns, null, 2)}
MOVIE: ${JSON.stringify(movieData, null, 2)}

Analyze factors that might lead to binge-watching:
- Movie's addictive qualities (cliffhangers, episodic nature, compelling plot)
- User's historical binge patterns
- Genre preferences and binge correlation
- Time of day and day of week factors
- Movie runtime and pacing

Provide analysis in JSON format:
{
  "movieId": ${movieId},
  "bingeScore": 0.7,
  "factors": ["Compelling plot", "User loves this genre", "Evening viewing time"],
  "similarMovies": [123, 456, 789],
  "warningFactors": ["Long runtime", "Complex plot requiring attention"]
}

Score 0-1 where 1 = very likely to trigger binge-watching.
Respond ONLY with valid JSON.
`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Error predicting binge risk:', error);
      return {
        movieId,
        bingeScore: 0.5,
        factors: ['Average engagement potential'],
        similarMovies: [],
        warningFactors: []
      };
    }
  }

  // Suggest optimal viewing times for movies
  static async suggestOptimalWatchTime(movieId: number, userId: string): Promise<{
    recommendedTimes: Date[];
    reasons: string[];
    avoidTimes: Date[];
    optimalDuration: number;
  }> {
    const userPatterns = await this.analyzeUserPatterns(userId);
    const movieData = await this.getMovieData(movieId);
    
    const recommendations = [];
    const reasons = [];
    
    // Find user's most active viewing times
    const topHours = Object.entries(userPatterns.patterns.preferredTimes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
    
    // Generate recommended times for the next week
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      
      for (const hour of topHours) {
        const recommendedTime = new Date(date);
        recommendedTime.setHours(hour, 0, 0, 0);
        
        if (recommendedTime > new Date()) {
          recommendations.push(recommendedTime);
          reasons.push(`Peak viewing time based on your history`);
        }
      }
    }
    
    return {
      recommendedTimes: recommendations.slice(0, 5),
      reasons,
      avoidTimes: [], // Times when user typically doesn't watch
      optimalDuration: userPatterns.patterns.sessionLengths[0] || 120
    };
  }

  // Detect abandonment risk and suggest alternatives
  static async detectAbandonmentRisk(movieId: number, userId: string, currentProgress: number): Promise<{
    abandonmentRisk: number;
    reasons: string[];
    alternatives: any[];
    interventions: string[];
  }> {
    try {
      const userPatterns = await this.analyzeUserPatterns(userId);
      const movieData = await this.getMovieData(movieId);
      
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `
Assess abandonment risk for a user watching a movie:

USER PATTERNS: ${JSON.stringify(userPatterns.patterns, null, 2)}
MOVIE: ${JSON.stringify(movieData, null, 2)}
CURRENT PROGRESS: ${currentProgress}% completed

Analyze risk factors:
- How far through the movie they are
- Typical drop-off points for this genre
- User's historical completion rates
- Movie pacing and engagement factors
- Time of day and viewing context

Provide assessment in JSON format:
{
  "abandonmentRisk": 0.6,
  "reasons": ["Past drop-off point", "Slow pacing in middle"],
  "alternatives": [
    {"title": "Similar Movie Title", "reason": "Faster paced alternative"}
  ],
  "interventions": ["Take a break", "Skip to next exciting scene"]
}

Risk score 0-1 where 1 = very likely to abandon.
Respond ONLY with valid JSON.
`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Error detecting abandonment risk:', error);
      return {
        abandonmentRisk: 0.3,
        reasons: ['Analysis unavailable'],
        alternatives: [],
        interventions: ['Continue watching']
      };
    }
  }

  private static async getMovieData(movieId: number): Promise<any> {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&append_to_response=keywords`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching movie data:', error);
      return { id: movieId, title: 'Unknown Movie' };
    }
  }

  // Generate viewing schedule recommendations
  static async generateViewingSchedule(userId: string, movieIds: number[]): Promise<{
    schedule: Array<{
      date: Date;
      movieId: number;
      reason: string;
      optimalLength: number;
    }>;
    warnings: string[];
  }> {
    const userPatterns = await this.analyzeUserPatterns(userId);
    const schedule = [];
    
    for (let i = 0; i < movieIds.length; i++) {
      const movieId = movieIds[i];
      const bingePredictor = await this.predictBingeRisk(movieId, userId);
      
      // Space out high-binge-risk movies
      const daysFromNow = bingePredictor.bingeScore > 0.7 ? i * 2 + 1 : i + 1;
      
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + daysFromNow);
      
      // Set to user's preferred time
      const preferredHour = Object.entries(userPatterns.patterns.preferredTimes)
        .sort(([,a], [,b]) => b - a)[0]?.[0];
      
      if (preferredHour) {
        scheduledDate.setHours(parseInt(preferredHour), 0, 0, 0);
      }
      
      schedule.push({
        date: scheduledDate,
        movieId,
        reason: bingePredictor.bingeScore > 0.7 ? 'Spaced for binge prevention' : 'Optimal timing',
        optimalLength: userPatterns.predictions.optimalSessionLength
      });
    }
    
    return {
      schedule,
      warnings: schedule
        .filter(item => item.reason.includes('binge'))
        .map(item => `High binge risk detected for movie ${item.movieId}`)
    };
  }
}
