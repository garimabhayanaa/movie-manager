import { GoogleGenerativeAI } from '@google/generative-ai';
import { database } from './database';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface PersonalityProfile {
  userId: string;
  bigFiveTraits: {
    openness: number; // 0-100
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  moviePersonality: {
    adventurousness: number;
    criticalThinking: number;
    emotionalSensitivity: number;
    socialViewing: number;
    genreFlexibility: number;
  };
  viewingPersona: 'explorer' | 'analyst' | 'socialite' | 'traditionalist' | 'eclectic';
  compatibilityFactors: string[];
  idealMatchTraits: PersonalityProfile['bigFiveTraits'];
  recommendationStyle: 'adventurous' | 'safe' | 'analytical' | 'social' | 'diverse';
}

interface PersonalityMatch {
  userId1: string;
  userId2: string;
  overallMatch: number;
  traitCompatibility: { [trait: string]: number };
  personalityComplement: boolean;
  sharedValues: string[];
  potentialConflicts: string[];
  recommendedInteraction: string;
}

export class PersonalityProfiler {
  static async analyzeUserPersonality(userId: string): Promise<PersonalityProfile> {
    try {
      const userData = await this.gatherPersonalityData(userId);
      const personality = await this.generatePersonalityProfile(userData);
      
      // Store profile for future use
      await this.storePersonalityProfile(userId, personality);
      
      return {
        userId,
        ...personality
      };
    } catch (error) {
      console.error('Error analyzing user personality:', error);
      throw error;
    }
  }

  private static async gatherPersonalityData(userId: string) {
    const userMovies = await database.getUserMovies(userId);
    const reviews = await database.getUserReviews(userId);
    const activities = await database.getActivities(userId, 50);
    const socialData = await database.getSocialInteractions(userId);
    
    return {
      watchedMovies: userMovies.filter(um => um.status === 'watched'),
      movieRatings: userMovies.filter(um => um.rating).map(um => ({
        movieId: um.movieId,
        rating: um.rating,
        date: um.watchedDate
      })),
      writtenReviews: reviews,
      socialActivities: activities,
      followingPatterns: socialData.following || [],
      listCreation: await database.getUserLists(userId),
      engagementStyle: socialData.engagementMetrics || {}
    };
  }

  private static async generatePersonalityProfile(userData: any): Promise<Omit<PersonalityProfile, 'userId'>> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Analyze this user's personality based on their movie behavior:

USER DATA: ${JSON.stringify(userData, null, 2)}

Generate a comprehensive personality profile in this exact JSON format:
{
  "bigFiveTraits": {
    "openness": 75,
    "conscientiousness": 60,
    "extraversion": 80,
    "agreeableness": 70,
    "neuroticism": 30
  },
  "moviePersonality": {
    "adventurousness": 85,
    "criticalThinking": 70,
    "emotionalSensitivity": 65,
    "socialViewing": 90,
    "genreFlexibility": 75
  },
  "viewingPersona": "explorer",
  "compatibilityFactors": ["Enjoys discovering new genres", "Values others' opinions", "Open to recommendations"],
  "idealMatchTraits": {
    "openness": 70,
    "conscientiousness": 65,
    "extraversion": 75,
    "agreeableness": 80,
    "neuroticism": 35
  },
  "recommendationStyle": "adventurous"
}

Analysis Guidelines:
- OPENNESS: Genre diversity, foreign films, experimental movies, willingness to try new things
- CONSCIENTIOUSNESS: Rating consistency, review detail, list organization, completion rates
- EXTRAVERSION: Social features usage, sharing behavior, group viewing preferences
- AGREEABLENESS: Review tone, rating generosity, social interaction positivity
- NEUROTICISM: Genre preferences (horror/thriller tolerance), rating volatility, stress preferences

Movie Personality Factors:
- ADVENTUROUSNESS: Willingness to watch unknown/risky movies
- CRITICAL THINKING: Review depth, rating thoughtfulness, genre analysis
- EMOTIONAL SENSITIVITY: Preference for emotional content, rating patterns
- SOCIAL VIEWING: Group features usage, sharing, discussion participation
- GENRE FLEXIBILITY: Range of genres watched and enjoyed

Viewing Personas:
- EXPLORER: Seeks new experiences, diverse genres, foreign films
- ANALYST: Deep reviews, critical thinking, thoughtful ratings
- SOCIALITE: Shares frequently, values others' opinions, group-oriented
- TRADITIONALIST: Prefers familiar genres, classic films, safe choices
- ECLECTIC: No clear pattern, varies by mood, highly diverse

Rate all traits 0-100. Analyze patterns in their movie choices and behaviors.
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error parsing personality profile:', parseError);
      return this.getFallbackPersonalityProfile();
    }
  }

  // Find personality-compatible users
  static async findPersonalityMatches(userId: string, limit: number = 10): Promise<PersonalityMatch[]> {
    try {
      const userPersonality = await this.analyzeUserPersonality(userId);
      const potentialMatches = await this.getPotentialMatches(userId);
      
      const matches: PersonalityMatch[] = [];
      
      for (const candidateId of potentialMatches) {
        try {
          const candidatePersonality = await this.analyzeUserPersonality(candidateId);
          const match = await this.calculatePersonalityMatch(userPersonality, candidatePersonality);
          
          matches.push({
            userId1: userId,
            userId2: candidateId,
            ...match
          });
        } catch (error) {
          console.error(`Error analyzing match with user ${candidateId}:`, error);
        }
      }
      
      return matches
        .sort((a, b) => b.overallMatch - a.overallMatch)
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding personality matches:', error);
      return [];
    }
  }

  private static async calculatePersonalityMatch(
    profile1: PersonalityProfile,
    profile2: PersonalityProfile
  ): Promise<Omit<PersonalityMatch, 'userId1' | 'userId2'>> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Calculate personality compatibility between two movie platform users:

USER 1: ${JSON.stringify(profile1, null, 2)}
USER 2: ${JSON.stringify(profile2, null, 2)}

Analyze their compatibility in this exact JSON format:
{
  "overallMatch": 0.82,
  "traitCompatibility": {
    "openness": 0.9,
    "conscientiousness": 0.7,
    "extraversion": 0.8,
    "agreeableness": 0.85,
    "neuroticism": 0.75
  },
  "personalityComplement": true,
  "sharedValues": ["Adventure in movie choices", "Thoughtful discussion", "Social viewing"],
  "potentialConflicts": ["Different tolerance for intense content"],
  "recommendedInteraction": "Great match for discovering new movies together, with User1 potentially introducing more adventurous choices"
}

Consider:
- Similar traits that create harmony
- Complementary differences that add value
- Potential areas of conflict or misunderstanding
- How they could benefit from each other's perspectives
- Movie-specific compatibility factors

Rate compatibility 0-1 where 1 = perfect personality match.
personalityComplement = true if differences enhance rather than conflict.
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error calculating personality match:', parseError);
      return this.getFallbackPersonalityMatch();
    }
  }

  // Generate personality-based movie recommendations
  static async getPersonalityBasedRecommendations(userId: string): Promise<{
    primaryRecommendations: any[];
    personalityGrowth: any[];
    socialRecommendations: any[];
    comfortZone: any[];
    reasoning: string;
  }> {
    const personality = await this.analyzeUserPersonality(userId);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Generate personality-tailored movie recommendations:

USER PERSONALITY: ${JSON.stringify(personality, null, 2)}

Create recommendations that match their personality and encourage growth:

{
  "primaryRecommendations": [
    {
      "title": "Movie Title",
      "reason": "Perfect fit for your explorer personality and high openness",
      "personalityMatch": 0.9
    }
  ],
  "personalityGrowth": [
    {
      "title": "Growth Movie",
      "reason": "Challenges your comfort zone in a positive way",
      "growthArea": "emotional sensitivity"
    }
  ],
  "socialRecommendations": [
    {
      "title": "Social Movie",
      "reason": "Great for group viewing based on your social nature",
      "socialValue": 0.8
    }
  ],
  "comfortZone": [
    {
      "title": "Comfort Movie",
      "reason": "Safe choice that aligns with your established preferences",
      "comfortLevel": 0.9
    }
  ],
  "reasoning": "Based on your explorer personality and high openness, these recommendations balance adventure with your social viewing preferences..."
}

Consider their viewing persona, trait levels, and growth opportunities.
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error generating personality recommendations:', parseError);
      return {
        primaryRecommendations: [],
        personalityGrowth: [],
        socialRecommendations: [],
        comfortZone: [],
        reasoning: 'Personality-based recommendations unavailable'
      };
    }
  }

  private static getFallbackPersonalityProfile(): Omit<PersonalityProfile, 'userId'> {
    return {
      bigFiveTraits: {
        openness: 60,
        conscientiousness: 60,
        extraversion: 60,
        agreeableness: 60,
        neuroticism: 40
      },
      moviePersonality: {
        adventurousness: 60,
        criticalThinking: 60,
        emotionalSensitivity: 60,
        socialViewing: 60,
        genreFlexibility: 60
      },
      viewingPersona: 'eclectic',
      compatibilityFactors: ['Balanced movie preferences'],
      idealMatchTraits: {
        openness: 60,
        conscientiousness: 60,
        extraversion: 60,
        agreeableness: 65,
        neuroticism: 35
      },
      recommendationStyle: 'diverse'
    };
  }

  private static getFallbackPersonalityMatch(): Omit<PersonalityMatch, 'userId1' | 'userId2'> {
    return {
      overallMatch: 0.6,
      traitCompatibility: {
        openness: 0.6,
        conscientiousness: 0.6,
        extraversion: 0.6,
        agreeableness: 0.6,
        neuroticism: 0.6
      },
      personalityComplement: false,
      sharedValues: ['General movie interest'],
      potentialConflicts: [],
      recommendedInteraction: 'Moderate compatibility for movie discussions'
    };
  }

  private static async getPotentialMatches(userId: string): Promise<string[]> {
    // Get users from similar interests, mutual follows, etc.
    const followers = await database.getFollowers(userId);
    const following = await database.getFollowing(userId);
    
    return [...followers.map(f => f.followerId), ...following.map(f => f.followingId)]
      .filter(id => id !== userId)
      .slice(0, 20);
  }

  private static async storePersonalityProfile(userId: string, profile: Omit<PersonalityProfile, 'userId'>) {
    try {
      await database.storePersonalityProfile(userId, {
        ...profile,
        analyzedAt: new Date(),
        version: '1.0'
      });
    } catch (error) {
      console.error('Error storing personality profile:', error);
    }
  }
}
