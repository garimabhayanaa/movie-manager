import { GoogleGenerativeAI } from '@google/generative-ai';
import { database } from './database';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface ConversationContext {
  userId: string;
  sessionId: string;
  messages: ChatMessage[];
  userProfile: any;
  currentTopic?: string;
  recommendations: any[];
  lastActivity: Date;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    emotion?: string;
    intent?: string;
    context?: any;
  };
}

export class ConversationalMovieAI {
  private static conversations = new Map<string, ConversationContext>();

  static async processQuery(
    userId: string,
    query: string,
    options: {
      sessionId?: string;
      isVoice?: boolean;
      context?: any;
    } = {}
  ): Promise<{
    response: string;
    movies?: any[];
    actions?: string[];
    followUp?: string;
    emotion?: string;
  }> {
    const { sessionId = 'default', isVoice = false, context } = options;
    
    try {
      // Get or create conversation context
      const conversationKey = `${userId}-${sessionId}`;
      let conversation = this.conversations.get(conversationKey);
      
      if (!conversation) {
        conversation = await this.initializeConversation(userId, sessionId);
        this.conversations.set(conversationKey, conversation);
      }

      // Add user message to conversation
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: query,
        timestamp: new Date(),
        metadata: {
          context: context,
          emotion: isVoice ? await this.detectVoiceEmotion(query) : undefined
        }
      };
      conversation.messages.push(userMessage);

      // Process the query with full context
      const response = await this.generateContextualResponse(conversation, query, isVoice);
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        metadata: {
          intent: response.actions?.[0],
          context: response.movies
        }
      };
      conversation.messages.push(assistantMessage);

      // Update recommendations
      if (response.movies) {
        conversation.recommendations = response.movies;
      }

      // Save conversation
      await this.saveConversation(conversation);
      
      return response;
    } catch (error) {
      console.error('Error processing conversational query:', error);
      return {
        response: "I apologize, but I'm having trouble understanding. Could you rephrase that?",
        actions: ['retry']
      };
    }
  }

  private static async initializeConversation(userId: string, sessionId: string): Promise<ConversationContext> {
    const userProfile = await database.getUserProfile(userId);
    const userMovies = await database.getUserMovies(userId);
    
    return {
      userId,
      sessionId,
      messages: [],
      userProfile: {
        ...userProfile,
        watchHistory: userMovies.slice(0, 20), // Recent history
        preferences: await this.analyzeUserPreferences(userMovies)
      },
      recommendations: [],
      lastActivity: new Date()
    };
  }

  private static async generateContextualResponse(
    conversation: ConversationContext,
    query: string,
    isVoice: boolean
  ): Promise<{
    response: string;
    movies?: any[];
    actions?: string[];
    followUp?: string;
    emotion?: string;
  }> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build context from conversation history
    const recentMessages = conversation.messages.slice(-10);
    const conversationHistory = recentMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `
You are an expert movie recommendation AI assistant with deep knowledge of cinema. You're having a conversation with a user about movies.

USER PROFILE:
- Movies watched: ${conversation.userProfile.watchHistory?.length || 0}
- Favorite genres: ${conversation.userProfile.preferences?.favoriteGenres?.join(', ') || 'Unknown'}
- Average rating: ${conversation.userProfile.preferences?.averageRating || 'Unknown'}

CONVERSATION HISTORY:
${conversationHistory}

CURRENT USER MESSAGE: "${query}"
${isVoice ? '[This was a voice message - respond conversationally]' : ''}

INSTRUCTIONS:
1. Understand the user's intent (recommendation, information, discussion, clarification)
2. Provide helpful, natural responses as if you're a knowledgeable friend
3. Make specific movie recommendations when appropriate with reasoning
4. Remember context from the conversation
5. Ask follow-up questions to better understand needs
6. Handle complex queries like "something like Inception but lighter" or "what should I watch on a rainy Sunday"

QUERY TYPES TO HANDLE:
- "Find me something like [movie] but [modifier]"
- "What should I watch when I'm [mood/situation]?"
- "I liked [movies], what else would I enjoy?"
- "Tell me about [movie/actor/director]"
- "What's trending/popular right now?"
- "I have [time duration], what can I watch?"

For recommendations, always explain WHY based on:
- User's viewing history
- Stated preferences
- Current mood/context
- Similar movies they've enjoyed

Response format as JSON:
{
  "response": "Conversational response here",
  "movies": [
    {
      "title": "Movie Title",
      "year": 2023,
      "reason": "Perfect because...",
      "confidence": 0.9,
      "tmdbId": 12345
    }
  ],
  "actions": ["search", "add_to_watchlist", "get_details"],
  "followUp": "Would you like more options in this style?",
  "emotion": "helpful"
}

Be natural, enthusiastic about movies, and genuinely helpful. Match the conversation style (formal/casual) to the user.
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      const parsed = JSON.parse(cleanResponse);
      
      // Enrich movie recommendations with full data
      if (parsed.movies) {
        parsed.movies = await this.enrichMovieRecommendations(parsed.movies);
      }
      
      return parsed;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return this.generateFallbackResponse(query);
    }
  }

  private static async enrichMovieRecommendations(movies: any[]): Promise<any[]> {
    const enriched = [];
    
    for (const movie of movies) {
      try {
        let movieData;
        if (movie.tmdbId) {
          movieData = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdbId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`);
          movieData = await movieData.json();
        } else {
          // Search by title
          const searchResult = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(movie.title)}`);
          const searchData = await searchResult.json();
          movieData = searchData.results[0];
        }
        
        if (movieData) {
          enriched.push({
            ...movieData,
            aiReason: movie.reason,
            confidence: movie.confidence
          });
        }
      } catch (error) {
        console.error('Error enriching movie recommendation:', error);
      }
    }
    
    return enriched;
  }

  private static generateFallbackResponse(query: string): {
    response: string;
    movies?: any[];
    actions?: string[];
    followUp?: string;
  } {
    return {
      response: `I understand you're looking for movie recommendations. Let me think about "${query}" and find something great for you. What genres do you usually enjoy?`,
      actions: ['clarify_preferences'],
      followUp: 'What mood are you in for watching?'
    };
  }

  // Voice-specific processing
  static async processVoiceQuery(
    userId: string,
    audioBlob: Blob,
    sessionId: string = 'voice'
  ): Promise<{
    transcript: string;
    response: string;
    movies?: any[];
    emotion?: string;
  }> {
    try {
      // Convert speech to text
      const transcript = await this.speechToText(audioBlob);
      
      // Analyze voice emotion
      const emotion = await this.detectVoiceEmotion(transcript);
      
      // Process with voice context
      const result = await this.processQuery(userId, transcript, {
        sessionId,
        isVoice: true,
        context: { emotion, source: 'voice' }
      });
      
      return {
        transcript,
        emotion,
        ...result
      };
    } catch (error) {
      console.error('Error processing voice query:', error);
      return {
        transcript: 'Sorry, I couldn\'t understand that',
        response: 'I had trouble processing your voice input. Could you try again?'
      };
    }
  }

  private static async speechToText(audioBlob: Blob): Promise<string> {
    // Implement Web Speech API or external service
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      return new Promise((resolve, reject) => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          resolve(transcript);
        };
        
        recognition.onerror = (event: any) => {
          reject(new Error('Speech recognition error'));
        };
        
        recognition.start();
      });
    }
    
    // Fallback - in real implementation, use cloud speech services
    return 'Mock transcript from voice input';
  }

  private static async detectVoiceEmotion(transcript: string): Promise<string> {
    // Simple emotion detection from text
    const emotions = {
      happy: ['great', 'awesome', 'love', 'amazing', 'fantastic'],
      sad: ['sad', 'down', 'depressed', 'melancholy', 'blue'],
      excited: ['excited', 'pumped', 'thrilled', 'energetic'],
      relaxed: ['chill', 'relax', 'calm', 'peaceful', 'easy'],
      bored: ['bored', 'nothing', 'whatever', 'don\'t care']
    };
    
    const lowerTranscript = transcript.toLowerCase();
    
    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => lowerTranscript.includes(keyword))) {
        return emotion;
      }
    }
    
    return 'neutral';
  }

  private static async analyzeUserPreferences(userMovies: any[]): Promise<any> {
    const watchedMovies = userMovies.filter(um => um.status === 'watched');
    
    // Analyze preferences from watching history
    const genreCounts: { [key: string]: number } = {};
    let totalRating = 0;
    let ratedCount = 0;
    
    for (const movie of watchedMovies) {
      if (movie.rating) {
        totalRating += movie.rating;
        ratedCount++;
      }
      
      // Would analyze genres from movie data
      // This is simplified for demo
    }
    
    return {
      favoriteGenres: Object.keys(genreCounts).slice(0, 3),
      averageRating: ratedCount > 0 ? totalRating / ratedCount : 3.5,
      totalWatched: watchedMovies.length
    };
  }

  private static async saveConversation(conversation: ConversationContext) {
    try {
      await database.saveConversation(conversation.userId, conversation.sessionId, {
        messages: conversation.messages.slice(-20), // Keep last 20 messages
        recommendations: conversation.recommendations,
        lastActivity: new Date()
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  // Get conversation history
  static async getConversationHistory(userId: string, sessionId: string = 'default'): Promise<ChatMessage[]> {
    const conversationKey = `${userId}-${sessionId}`;
    const conversation = this.conversations.get(conversationKey);
    
    if (conversation) {
      return conversation.messages;
    }
    
    // Load from database
    try {
      const saved = await database.getConversation(userId, sessionId);
      return saved?.messages || [];
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
  }

  // Clear conversation
  static clearConversation(userId: string, sessionId: string = 'default') {
    const conversationKey = `${userId}-${sessionId}`;
    this.conversations.delete(conversationKey);
  }
}
