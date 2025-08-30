import { GoogleGenerativeAI } from '@google/generative-ai';
import { database } from './database';
import { tmdb } from './tmdb';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: any;
}

interface ConversationContext {
  userId: string;
  sessionId: string;
  messages: ChatMessage[];
  userPreferences: any;
  currentTopic?: string;
  lastRecommendations?: any[];
}

export class ConversationalMovieAssistant {
  private static conversations = new Map<string, ConversationContext>();

  static async processUserMessage(
    userId: string,
    message: string,
    sessionId: string = 'default'
  ): Promise<{
    response: string;
    recommendations?: any[];
    actions?: string[];
  }> {
    try {
      // Get or create conversation context
      const contextKey = `${userId}-${sessionId}`;
      let context = this.conversations.get(contextKey);
      
      if (!context) {
        context = await this.initializeContext(userId, sessionId);
        this.conversations.set(contextKey, context);
      }

      // Add user message to context
      context.messages.push({
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Generate response
      const result = await this.generateResponse(context, message);
      
      // Add assistant response to context
      context.messages.push({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        context: result.recommendations
      });

      // Save conversation
      await this.saveConversation(context);
      
      return result;
    } catch (error) {
      console.error('Error processing user message:', error);
      return {
        response: 'I apologize, but I encountered an error. Could you please try again?',
        recommendations: [],
        actions: []
      };
    }
  }

  private static async initializeContext(
    userId: string, 
    sessionId: string
  ): Promise<ConversationContext> {
    const userPreferences = await this.getUserPreferences(userId);
    
    return {
      userId,
      sessionId,
      messages: [],
      userPreferences,
      currentTopic: undefined,
      lastRecommendations: []
    };
  }

  private static async generateResponse(
    context: ConversationContext,
    userMessage: string
  ): Promise<{
    response: string;
    recommendations?: any[];
    actions?: string[];
  }> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build conversation history
    const conversationHistory = context.messages
      .slice(-10) // Keep last 10 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `
You are a knowledgeable and friendly movie recommendation assistant. Help users discover movies they'll love.

USER PREFERENCES: ${JSON.stringify(context.userPreferences)}

CONVERSATION HISTORY:
${conversationHistory}

CURRENT USER MESSAGE: "${userMessage}"

Instructions:
1. Understand the user's request (recommendation, information, opinion, etc.)
2. Provide helpful, conversational responses
3. Make specific movie recommendations when appropriate
4. Remember context from previous messages
5. Ask follow-up questions to better understand preferences
6. Be enthusiastic about movies while being honest about potential drawbacks

Response Types:
- RECOMMENDATION: Suggest specific movies with reasons
- INFORMATION: Provide movie details, cast info, etc.
- DISCUSSION: Engage in movie-related conversation
- CLARIFICATION: Ask questions to better understand needs

For recommendations, always explain WHY you're suggesting each movie based on:
- User's viewing history
- Stated preferences
- Current mood/context
- Similar movies they've enjoyed

FORMAT YOUR RESPONSE AS JSON:
{
  "response": "Your conversational response here",
  "recommendations": [
    {
      "title": "Movie Title",
      "year": 2023,
      "reason": "Why this movie fits their request",
      "confidence": 0.9
    }
  ],
  "actions": ["search_movie", "add_to_watchlist", "get_more_info"],
  "followUp": "Optional follow-up question"
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Fetch full movie details for recommendations
        if (parsed.recommendations) {
          parsed.recommendations = await this.enrichRecommendations(parsed.recommendations);
        }
        
        return parsed;
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }
    
    // Fallback response
    return {
      response: responseText,
      recommendations: [],
      actions: []
    };
  }

  private static async enrichRecommendations(recommendations: any[]): Promise<any[]> {
    const enriched = [];
    
    for (const rec of recommendations) {
      try {
        const searchResults = await tmdb.searchMovies(rec.title, 1);
        if (searchResults.results.length > 0) {
          const movie = searchResults.results[0];
          enriched.push({
            ...movie,
            aiReason: rec.reason,
            confidence: rec.confidence
          });
        }
      } catch (error) {
        console.error('Error enriching recommendation:', error);
      }
    }
    
    return enriched;
  }

  static async processVoiceInput(
    userId: string,
    audioBlob: Blob,
    sessionId: string = 'voice'
  ): Promise<{
    transcript: string;
    response: string;
    recommendations?: any[];
  }> {
    try {
      // Convert speech to text (would use Web Speech API or external service)
      const transcript = await this.speechToText(audioBlob);
      
      // Analyze voice emotion (optional enhancement)
      const voiceEmotion = await this.analyzeVoiceEmotion(audioBlob);
      
      // Process the transcript with emotional context
      const result = await this.processUserMessage(
        userId,
        `${transcript} [Voice emotion: ${voiceEmotion}]`,
        sessionId
      );
      
      return {
        transcript,
        ...result
      };
    } catch (error) {
      console.error('Error processing voice input:', error);
      return {
        transcript: 'Could not process voice input',
        response: 'I had trouble hearing you. Could you try again?'
      };
    }
  }

  private static async speechToText(audioBlob: Blob): Promise<string> {
    // Implement speech-to-text conversion
    // This could use Web Speech API, Google Speech-to-Text, or other services
    return 'Mock transcript from voice input';
  }

  private static async analyzeVoiceEmotion(audioBlob: Blob): Promise<string> {
    // Analyze voice for emotional tone
    // This would use audio analysis libraries or services
    return 'neutral';
  }

  private static async getUserPreferences(userId: string): Promise<any> {
    try {
      const userMovies = await database.getUserMovies(userId);
      const watchedMovies = userMovies.filter(um => um.status === 'watched');
      
      // Build preference profile
      const genres: { [key: string]: number } = {};
      let totalRating = 0;
      let ratedCount = 0;
      
      for (const userMovie of watchedMovies) {
        if (userMovie.rating) {
          totalRating += userMovie.rating;
          ratedCount++;
        }
        
        // Would analyze genres from movie data
      }
      
      return {
        moviesWatched: watchedMovies.length,
        averageRating: ratedCount > 0 ? totalRating / ratedCount : 3.5,
        favoriteGenres: Object.entries(genres)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([name]) => name)
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return {
        moviesWatched: 0,
        averageRating: 3.5,
        favoriteGenres: []
      };
    }
  }

  private static async saveConversation(context: ConversationContext) {
    try {
      await database.saveConversation(context.userId, context.sessionId, {
        messages: context.messages.slice(-20), // Keep last 20 messages
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  static async getConversationHistory(
    userId: string, 
    sessionId: string = 'default'
  ): Promise<ChatMessage[]> {
    try {
      const contextKey = `${userId}-${sessionId}`;
      const context = this.conversations.get(contextKey);
      
      if (context) {
        return context.messages;
      }
      
      // Load from database
      const saved = await database.getConversation(userId, sessionId);
      return saved?.messages || [];
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  static clearConversation(userId: string, sessionId: string = 'default') {
    const contextKey = `${userId}-${sessionId}`;
    this.conversations.delete(contextKey);
  }
}
