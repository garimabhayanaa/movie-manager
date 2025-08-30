import { GoogleGenerativeAI } from '@google/generative-ai';
import { database } from './database';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface FriendCompatibility {
  userId1: string;
  userId2: string;
  overallCompatibility: number;
  sharedInterests: string[];
  complementaryDifferences: string[];
  conflictAreas: string[];
  watchingStyle: 'similar' | 'complementary' | 'conflicting';
  recommendedMovies: any[];
  socialDynamics: {
    leaderType: 'user1' | 'user2' | 'balanced';
    decisionMaking: 'consensus' | 'alternating' | 'dominant';
    preferredGenres: string[];
  };
}

interface GroupRecommendation {
  groupId: string;
  members: string[];
  consensusMovies: any[];
  compromiseMovies: any[];
  polarizingMovies: any[];
  groupDynamics: {
    dominantPreferences: string[];
    minorityPreferences: string[];
    negotiationStrategy: string;
  };
  sessionRecommendations: {
    optimal: any[];
    backup: any[];
    safePicks: any[];
  };
}

interface SocialInfluence {
  userId: string;
  influenceScore: number;
  influenceType: 'trendsetter' | 'follower' | 'critic' | 'casual';
  socialReach: number;
  credibilityScore: number;
  genreAuthority: { [genre: string]: number };
  followersImpact: {
    moviesWatched: number;
    ratingsInfluence: number;
    reviewsShared: number;
  };
}

export class SocialIntelligenceAI {
  static async analyzeFriendCompatibility(userId1: string, userId2: string): Promise<FriendCompatibility> {
    try {
      const user1Data = await this.getUserMovieProfile(userId1);
      const user2Data = await this.getUserMovieProfile(userId2);
      
      const compatibility = await this.calculateCompatibility(user1Data, user2Data);
      
      return {
        userId1,
        userId2,
        ...compatibility
      };
    } catch (error) {
      console.error('Error analyzing friend compatibility:', error);
      throw error;
    }
  }

  private static async calculateCompatibility(user1: any, user2: any): Promise<Omit<FriendCompatibility, 'userId1' | 'userId2'>> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Analyze movie compatibility between two users:

USER 1 PROFILE:
- Favorite genres: ${user1.favoriteGenres?.join(', ') || 'Unknown'}
- Average rating: ${user1.averageRating || 'Unknown'}
- Movies watched: ${user1.moviesWatched || 0}
- Preferred decades: ${user1.preferredDecades?.join(', ') || 'Unknown'}
- Viewing patterns: ${JSON.stringify(user1.viewingPatterns)}

USER 2 PROFILE:
- Favorite genres: ${user2.favoriteGenres?.join(', ') || 'Unknown'}
- Average rating: ${user2.averageRating || 'Unknown'}
- Movies watched: ${user2.moviesWatched || 0}
- Preferred decades: ${user2.preferredDecades?.join(', ') || 'Unknown'}
- Viewing patterns: ${JSON.stringify(user2.viewingPatterns)}

Analyze their compatibility for movie watching in this exact JSON format:
{
  "overallCompatibility": 0.75,
  "sharedInterests": ["Action movies", "Sci-fi classics", "Similar rating standards"],
  "complementaryDifferences": ["User1 likes horror, User2 likes romance - good for variety"],
  "conflictAreas": ["Different preferences for movie length", "Opposing views on subtitles"],
  "watchingStyle": "complementary",
  "recommendedMovies": [
    {
      "title": "Movie Title",
      "reason": "Appeals to both users' interests",
      "compatibilityScore": 0.9
    }
  ],
  "socialDynamics": {
    "leaderType": "balanced",
    "decisionMaking": "consensus",
    "preferredGenres": ["Action", "Comedy", "Drama"]
  }
}

Consider:
- Shared genre preferences and rating patterns
- Complementary differences that add variety
- Potential conflict areas in movie selection
- How their different tastes could enhance the experience
- Social dynamics and decision-making patterns

Rate compatibility 0-1 where 1 = perfect movie watching partners.
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error parsing compatibility analysis:', parseError);
      return this.getFallbackCompatibility();
    }
  }

  // Generate group recommendations for multiple users
  static async generateGroupRecommendations(userIds: string[], sessionType?: string): Promise<GroupRecommendation> {
    try {
      const userProfiles = await Promise.all(
        userIds.map(id => this.getUserMovieProfile(id))
      );
      
      const groupAnalysis = await this.analyzeGroupDynamics(userProfiles, sessionType);
      
      return {
        groupId: `group_${Date.now()}`,
        members: userIds,
        ...groupAnalysis
      };
    } catch (error) {
      console.error('Error generating group recommendations:', error);
      throw error;
    }
  }

  private static async analyzeGroupDynamics(profiles: any[], sessionType?: string): Promise<Omit<GroupRecommendation, 'groupId' | 'members'>> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Analyze group movie preferences and generate recommendations:

GROUP PROFILES: ${JSON.stringify(profiles, null, 2)}
SESSION TYPE: ${sessionType || 'general'}

Create group recommendations in this exact JSON format:
{
  "consensusMovies": [
    {
      "title": "Movie Title",
      "reason": "Appeals to all group members",
      "groupScore": 0.9
    }
  ],
  "compromiseMovies": [
    {
      "title": "Movie Title",
      "reason": "Good middle ground for diverse tastes",
      "groupScore": 0.7
    }
  ],
  "polarizingMovies": [
    {
      "title": "Movie Title",
      "reason": "Some will love it, others might not",
      "groupScore": 0.5,
      "warning": "May divide the group"
    }
  ],
  "groupDynamics": {
    "dominantPreferences": ["Action", "Comedy"],
    "minorityPreferences": ["Documentary", "Foreign"],
    "negotiationStrategy": "Take turns choosing or find middle ground"
  },
  "sessionRecommendations": {
    "optimal": [{"title": "Perfect for everyone"}],
    "backup": [{"title": "Safe choices if optimal fails"}],
    "safePicks": [{"title": "Guaranteed not to offend anyone"}]
  }
}

Consider:
- Common ground among all users
- How to balance different preferences
- Movies that work well for group viewing
- Social dynamics and compromise strategies
- Session type requirements (date night, family time, party, etc.)

Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error parsing group analysis:', parseError);
      return this.getFallbackGroupRecommendation();
    }
  }

  // Analyze user's social influence on movie choices
  static async analyzeSocialInfluence(userId: string): Promise<SocialInfluence> {
    try {
      const userProfile = await this.getUserMovieProfile(userId);
      const socialMetrics = await this.calculateSocialMetrics(userId);
      const influence = await this.calculateInfluenceScore(userProfile, socialMetrics);
      
      return {
        userId,
        ...influence
      };
    } catch (error) {
      console.error('Error analyzing social influence:', error);
      throw error;
    }
  }

  private static async calculateSocialMetrics(userId: string) {
    const followers = await database.getFollowers(userId);
    const following = await database.getFollowing(userId);
    const reviews = await database.getUserReviews(userId);
    const activities = await database.getActivities(userId, 100);
    
    return {
      followersCount: followers.length,
      followingCount: following.length,
      reviewsCount: reviews.length,
      activitiesCount: activities.length,
      avgRating: reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length || 0
    };
  }

  private static async calculateInfluenceScore(profile: any, metrics: any): Promise<Omit<SocialInfluence, 'userId'>> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Calculate social influence score for a movie platform user:

USER PROFILE: ${JSON.stringify(profile)}
SOCIAL METRICS: ${JSON.stringify(metrics)}

Analyze their influence potential in this exact JSON format:
{
  "influenceScore": 7.5,
  "influenceType": "trendsetter",
  "socialReach": 1250,
  "credibilityScore": 8.2,
  "genreAuthority": {
    "Action": 8.5,
    "Drama": 6.2,
    "Comedy": 7.8
  },
  "followersImpact": {
    "moviesWatched": 45,
    "ratingsInfluence": 0.7,
    "reviewsShared": 23
  }
}

Consider:
- Number and quality of followers
- Review quality and helpfulness
- Consistency in movie opinions
- Engagement with community
- Authority in specific genres
- Track record of successful recommendations

Rate scores 0-10 where 10 = maximum influence.
Influence types: trendsetter, follower, critic, casual
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error parsing influence analysis:', parseError);
      return this.getFallbackInfluenceAnalysis();
    }
  }

  // Detect social watching trends among friend groups
  static async detectSocialTrends(userIds: string[]): Promise<{
    trendingMovies: any[];
    emergingGenres: string[];
    groupInfluencers: string[];
    socialRecommendations: any[];
  }> {
    const userProfiles = await Promise.all(
      userIds.map(id => this.getUserMovieProfile(id))
    );
    
    // Analyze common patterns
    const movieCounts: { [movieId: string]: number } = {};
    const genreCounts: { [genre: string]: number } = {};
    
    userProfiles.forEach(profile => {
      profile.recentMovies?.forEach((movie: any) => {
        movieCounts[movie.id] = (movieCounts[movie.id] || 0) + 1;
      });
      
      profile.favoriteGenres?.forEach((genre: string) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });
    
    const trendingMovies = Object.entries(movieCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([movieId]) => ({ id: movieId }));
    
    const emergingGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);
    
    return {
      trendingMovies,
      emergingGenres,
      groupInfluencers: userIds.slice(0, 3), // Simplified
      socialRecommendations: trendingMovies.slice(0, 5)
    };
  }

  private static async getUserMovieProfile(userId: string) {
    const userMovies = await database.getUserMovies(userId);
    const watchedMovies = userMovies.filter(um => um.status === 'watched');
    
    // Analyze user preferences
    const genreCounts: { [genre: string]: number } = {};
    let totalRating = 0;
    let ratedCount = 0;
    
    watchedMovies.forEach(movie => {
      if (movie.rating) {
        totalRating += movie.rating;
        ratedCount++;
      }
      // Would analyze genres from movie data
    });
    
    return {
      userId,
      moviesWatched: watchedMovies.length,
      averageRating: ratedCount > 0 ? totalRating / ratedCount : 3.5,
      favoriteGenres: Object.keys(genreCounts).slice(0, 5),
      recentMovies: watchedMovies.slice(0, 10),
      viewingPatterns: {
        frequency: watchedMovies.length > 50 ? 'frequent' : 'casual',
        preferredLength: 'medium' // Would calculate from actual data
      }
    };
  }

  private static getFallbackCompatibility(): Omit<FriendCompatibility, 'userId1' | 'userId2'> {
    return {
      overallCompatibility: 0.7,
      sharedInterests: ['Similar movie interests'],
      complementaryDifferences: ['Different perspectives add variety'],
      conflictAreas: [],
      watchingStyle: 'similar',
      recommendedMovies: [],
      socialDynamics: {
        leaderType: 'balanced',
        decisionMaking: 'consensus',
        preferredGenres: ['Comedy', 'Drama']
      }
    };
  }

  private static getFallbackGroupRecommendation(): Omit<GroupRecommendation, 'groupId' | 'members'> {
    return {
      consensusMovies: [],
      compromiseMovies: [],
      polarizingMovies: [],
      groupDynamics: {
        dominantPreferences: ['Popular genres'],
        minorityPreferences: ['Niche interests'],
        negotiationStrategy: 'Take turns choosing'
      },
      sessionRecommendations: {
        optimal: [],
        backup: [],
        safePicks: []
      }
    };
  }

  private static getFallbackInfluenceAnalysis(): Omit<SocialInfluence, 'userId'> {
    return {
      influenceScore: 5.0,
      influenceType: 'casual',
      socialReach: 50,
      credibilityScore: 6.0,
      genreAuthority: {},
      followersImpact: {
        moviesWatched: 0,
        ratingsInfluence: 0,
        reviewsShared: 0
      }
    };
  }
}
