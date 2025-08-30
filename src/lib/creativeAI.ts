import { GoogleGenerativeAI } from '@google/generative-ai';
import { tmdb } from './tmdb';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface AlternativeEnding {
  movieId: number;
  originalTitle: string;
  alternativeTitle: string;
  scenario: string;
  description: string;
  tone: 'darker' | 'lighter' | 'more_action' | 'romantic' | 'comedic' | 'philosophical';
  plausibility: number; // 0-1 score
  fanRating: number; // Predicted fan reception
}

interface ThumbnailVariation {
  movieId: number;
  style: 'minimalist' | 'action_packed' | 'artistic' | 'nostalgic' | 'modern' | 'dramatic';
  targetAudience: string;
  colorScheme: string[];
  elements: string[];
  description: string;
}

interface StyleTransfer {
  originalMovieId: number;
  styleReference: string;
  description: string;
  visualElements: string[];
  moodShift: string;
  genreShift?: string;
}

export class CreativeMovieAI {
  static async generateAlternativeEndings(movieId: number, count: number = 3): Promise<AlternativeEnding[]> {
    try {
      const movie = await tmdb.getMovie(movieId);
      const endings = [];
      
      const tones: AlternativeEnding['tone'][] = ['darker', 'lighter', 'more_action', 'romantic', 'comedic'];
      
      for (let i = 0; i < Math.min(count, tones.length); i++) {
        const ending = await this.generateSingleEnding(movie, tones[i]);
        endings.push(ending);
      }
      
      return endings;
    } catch (error) {
      console.error('Error generating alternative endings:', error);
      return [];
    }
  }

  private static async generateSingleEnding(movie: any, tone: AlternativeEnding['tone']): Promise<AlternativeEnding> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Create an alternative ending for this movie with a ${tone} tone:

MOVIE: ${movie.title} (${new Date(movie.release_date).getFullYear()})
GENRES: ${movie.genres?.map(g => g.name).join(', ')}
PLOT: ${movie.overview}
RUNTIME: ${movie.runtime} minutes
RATING: ${movie.vote_average}/10

Generate a creative alternative ending that:
1. Maintains character consistency
2. Follows logical story progression
3. Shifts the tone to be ${tone}
4. Provides satisfying narrative closure
5. Could realistically have been filmed

Provide the alternative ending in this exact JSON format:
{
  "movieId": ${movie.id},
  "originalTitle": "${movie.title}",
  "alternativeTitle": "${movie.title}: [Tone] Ending",
  "scenario": "Brief setup of how this ending diverges",
  "description": "Detailed description of the alternative ending (200-300 words)",
  "tone": "${tone}",
  "plausibility": 0.8,
  "fanRating": 7.5
}

Make the ending creative but believable within the movie's universe.
Consider how this tone shift would affect character arcs and themes.
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error parsing alternative ending:', parseError);
      return this.getFallbackEnding(movie, tone);
    }
  }

  private static getFallbackEnding(movie: any, tone: AlternativeEnding['tone']): AlternativeEnding {
    return {
      movieId: movie.id,
      originalTitle: movie.title,
      alternativeTitle: `${movie.title}: Alternative Ending`,
      scenario: 'Creative alternative ending generated',
      description: `A ${tone} alternative ending that explores different possibilities for the characters and story.`,
      tone,
      plausibility: 0.7,
      fanRating: 7.0
    };
  }

  // Generate dynamic thumbnails for different audiences
  static async generateThumbnailVariations(movieId: number, targetAudiences: string[]): Promise<ThumbnailVariation[]> {
    const movie = await tmdb.getMovie(movieId);
    const variations = [];
    
    const styles: ThumbnailVariation['style'][] = ['minimalist', 'action_packed', 'artistic', 'nostalgic', 'modern', 'dramatic'];
    
    for (let i = 0; i < Math.min(targetAudiences.length, styles.length); i++) {
      const variation = await this.generateThumbnailVariation(movie, targetAudiences[i], styles[i]);
      variations.push(variation);
    }
    
    return variations;
  }

  private static async generateThumbnailVariation(
    movie: any, 
    audience: string, 
    style: ThumbnailVariation['style']
  ): Promise<ThumbnailVariation> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Design a movie thumbnail that appeals to ${audience} using a ${style} style:

MOVIE: ${movie.title}
GENRES: ${movie.genres?.map(g => g.name).join(', ')}
PLOT: ${movie.overview}
TARGET AUDIENCE: ${audience}
STYLE: ${style}

Create a thumbnail design description in this exact JSON format:
{
  "movieId": ${movie.id},
  "style": "${style}",
  "targetAudience": "${audience}",
  "colorScheme": ["#1a1a2e", "#16213e", "#e94560"],
  "elements": ["Close-up of protagonist", "Dramatic lighting", "Bold title typography"],
  "description": "Detailed description of the thumbnail design, layout, and visual appeal"
}

Consider:
- What visual elements would appeal to ${audience}
- How ${style} aesthetic should influence color, composition, typography
- Key scenes or characters that would attract this audience
- Emotional tone that resonates with this demographic
- Current design trends for this audience segment

Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error generating thumbnail variation:', parseError);
      return {
        movieId: movie.id,
        style,
        targetAudience: audience,
        colorScheme: ['#000000', '#ffffff'],
        elements: ['Movie poster', 'Title text'],
        description: `${style} thumbnail designed for ${audience}`
      };
    }
  }

  // Style transfer - reimagine movies in different visual styles
  static async generateStyleTransfer(movieId: number, styleReferences: string[]): Promise<StyleTransfer[]> {
    const movie = await tmdb.getMovie(movieId);
    const transfers = [];
    
    for (const style of styleReferences) {
      const transfer = await this.generateSingleStyleTransfer(movie, style);
      transfers.push(transfer);
    }
    
    return transfers;
  }

  private static async generateSingleStyleTransfer(movie: any, styleReference: string): Promise<StyleTransfer> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Reimagine this movie in the visual style of ${styleReference}:

MOVIE: ${movie.title}
ORIGINAL GENRES: ${movie.genres?.map(g => g.name).join(', ')}
PLOT: ${movie.overview}
STYLE REFERENCE: ${styleReference}

Describe how this movie would look and feel if reimagined in this style:

Provide the style transfer in this exact JSON format:
{
  "originalMovieId": ${movie.id},
  "styleReference": "${styleReference}",
  "description": "Detailed description of how the movie would look in this style",
  "visualElements": ["Element 1", "Element 2", "Element 3"],
  "moodShift": "How the mood/atmosphere would change",
  "genreShift": "Any potential genre shifts this style might cause"
}

Consider:
- Visual aesthetics (color, lighting, cinematography)
- How the style would affect storytelling
- Character design and costume changes
- Set design and locations
- Overall atmospheric shifts
- Whether the style would enhance or change the themes

Be creative but respectful to both the original movie and the reference style.
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error generating style transfer:', parseError);
      return {
        originalMovieId: movie.id,
        styleReference,
        description: `${movie.title} reimagined in the style of ${styleReference}`,
        visualElements: ['Visual adaptation', 'Style integration'],
        moodShift: 'Atmospheric transformation',
        genreShift: 'Potential genre evolution'
      };
    }
  }

  // Generate "What If" scenarios
  static async generateWhatIfScenarios(movieId: number): Promise<Array<{
    scenario: string;
    description: string;
    impact: 'minor' | 'moderate' | 'major';
    plausibility: number;
  }>> {
    const movie = await tmdb.getMovie(movieId);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Generate creative "What If" scenarios for this movie:

MOVIE: ${movie.title}
PLOT: ${movie.overview}
CHARACTERS: ${movie.credits?.cast?.slice(0, 5).map(c => c.name).join(', ') || 'Main characters'}

Create 5 interesting "What If" scenarios that explore different possibilities:

Examples:
- What if the main character made a different choice at a key moment?
- What if the movie was set in a different time period?
- What if a supporting character was the protagonist?
- What if the antagonist succeeded?
- What if a key event never happened?

Format as a JSON array:
[
  {
    "scenario": "What if [specific scenario]?",
    "description": "Detailed exploration of how this would change the story",
    "impact": "major",
    "plausibility": 0.7
  }
]

Make scenarios thought-provoking and explore meaningful story alternatives.
Respond ONLY with valid JSON array.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error generating what-if scenarios:', parseError);
      return [{
        scenario: 'What if the story had a different ending?',
        description: 'Alternative story possibilities',
        impact: 'moderate',
        plausibility: 0.8
      }];
    }
  }

  // Movie mashup generator
  static async generateMovieMashup(movieId1: number, movieId2: number): Promise<{
    title: string;
    plot: string;
    genre: string;
    tone: string;
    characters: string[];
    visualStyle: string;
    targetAudience: string;
  }> {
    const movie1 = await tmdb.getMovie(movieId1);
    const movie2 = await tmdb.getMovie(movieId2);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Create a creative mashup combining these two movies:

MOVIE 1: ${movie1.title}
Genre: ${movie1.genres?.map(g => g.name).join(', ')}
Plot: ${movie1.overview}

MOVIE 2: ${movie2.title}
Genre: ${movie2.genres?.map(g => g.name).join(', ')}
Plot: ${movie2.overview}

Create an innovative mashup that combines elements from both movies in a creative way:

{
  "title": "Creative mashup title",
  "plot": "Detailed plot combining elements from both movies",
  "genre": "Hybrid genre classification",
  "tone": "Overall tone of the mashup",
  "characters": ["Character concepts from both movies"],
  "visualStyle": "Combined visual approach",
  "targetAudience": "Who would enjoy this mashup"
}

Be creative and find unexpected ways to blend the movies that create something new and interesting.
Respond ONLY with valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const cleanResponse = response.replace(/``````/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error generating movie mashup:', parseError);
      return {
        title: `${movie1.title} meets ${movie2.title}`,
        plot: 'A creative combination of both movie elements',
        genre: 'Hybrid',
        tone: 'Mixed',
        characters: ['Combined character concepts'],
        visualStyle: 'Blended aesthetic',
        targetAudience: 'Fans of both original movies'
      };
    }
  }
}
