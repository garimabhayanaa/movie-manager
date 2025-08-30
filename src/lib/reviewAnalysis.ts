import { GoogleGenerativeAI } from '@google/generative-ai';
import { database } from './database';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface ReviewAnalysis {
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral' | 'mixed';
    score: number; // -1 to 1
    confidence: number;
    emotions: { [emotion: string]: number };
  };
  topics: {
    acting: number;
    plot: number;
    visuals: number;
    audio: number;
    pacing: number;
    characters: number;
    themes: number;
  };
  authenticity: {
    isFake: boolean;
    confidence: number;
    reasons: string[];
  };
  summary: string;
  keyPoints: string[];
  spoilerRisk: number; // 0-1
}

interface ReviewSummary {
  overallSentiment: string;
  consensusPoints: string[];
  controversialAspects: string[];
  summary: string;
  ratingDistribution: { [rating: number]: number };
  topPositives: string[];
  topNegatives: string[];
}

export class ReviewAnalyzer {
  static async analyzeReview(reviewText: string, movieId?: number): Promise<ReviewAnalysis> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `
Analyze this movie review in detail:

REVIEW: "${reviewText}"

Provide comprehensive analysis:

1. SENTIMENT ANALYSIS:
   - Overall sentiment (positive/negative/neutral/mixed)
   - Numerical score (-1 to 1)
   - Confidence level (0-1)
   - Specific emotions detected (joy, anger, disappointment, excitement, etc.)

2. TOPIC ANALYSIS (rate 0-10 how much each topic is discussed):
   - Acting performance
   - Plot/story quality
   - Visual effects/cinematography
   - Audio/soundtrack
   - Pacing
   - Character development
   - Themes/messages

3. AUTHENTICITY CHECK:
   - Detect if review seems fake/bot-generated
   - Confidence level
   - Specific reasons for assessment

4. CONTENT ANALYSIS:
   - Key points made by reviewer
   - Spoiler risk (0-1 scale)
   - 2-sentence summary

FORMAT AS JSON:
{
  "sentiment": {
    "overall": "positive",
    "score": 0.7,
    "confidence": 0.9,
    "emotions": {"joy": 0.8, "excitement": 0.6}
  },
  "topics": {
    "acting": 8,
    "plot": 6,
    "visuals": 4,
    "audio": 2,
    "pacing": 7,
    "characters": 5,
    "themes": 3
  },
  "authenticity": {
    "isFake": false,
    "confidence": 0.85,
    "reasons": ["Natural language patterns", "Specific details"]
  },
  "summary": "Review summary here",
  "keyPoints": ["point1", "point2"],
  "spoilerRisk": 0.2
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Failed to parse review analysis');
    } catch (error) {
      console.error('Error analyzing review:', error);
      return this.getFallbackReviewAnalysis();
    }
  }

  static async summarizeReviews(
    movieId: number, 
    reviews: string[], 
    ratings: number[]
  ): Promise<ReviewSummary> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const reviewsText = reviews.map((review, index) => 
        `Rating: ${ratings[index]}/5\nReview: ${review}`
      ).join('\n\n---\n\n');

      const prompt = `
Analyze and summarize all these movie reviews:

${reviewsText}

Provide a comprehensive summary:

1. OVERALL SENTIMENT: What's the general consensus?

2. CONSENSUS POINTS: What do most reviewers agree on?

3. CONTROVERSIAL ASPECTS: What divides opinions?

4. COMPREHENSIVE SUMMARY: 3-4 sentence overview

5. RATING DISTRIBUTION: Count of each rating

6. TOP POSITIVES: Most praised aspects

7. TOP NEGATIVES: Most criticized aspects

FORMAT AS JSON:
{
  "overallSentiment": "mostly positive with some concerns",
  "consensusPoints": ["point1", "point2"],
  "controversialAspects": ["aspect1", "aspect2"],
  "summary": "Overall summary here",
  "ratingDistribution": {"5": 10, "4": 15, "3": 8, "2": 3, "1": 1},
  "topPositives": ["great acting", "stunning visuals"],
  "topNegatives": ["slow pacing", "weak ending"]
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Failed to parse review summary');
    } catch (error) {
      console.error('Error summarizing reviews:', error);
      return this.getFallbackReviewSummary();
    }
  }

  static async detectFakeReviews(reviews: string[]): Promise<{
    fakeReviews: number[];
    overallFakePercentage: number;
    reasons: { [index: number]: string[] };
  }> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const reviewsText = reviews.map((review, index) => 
        `Review ${index}: ${review}`
      ).join('\n\n');

      const prompt = `
Analyze these reviews for authenticity. Detect which ones might be fake or bot-generated:

${reviewsText}

Look for signs of fake reviews:
- Generic language patterns
- Overly promotional tone
- Lack of specific details
- Repetitive phrases
- Unnatural writing style
- Extreme ratings without justification

Return analysis of suspicious reviews with specific reasons.
`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse response to identify fake reviews
      // This would be implemented based on the AI response format
      
      return {
        fakeReviews: [],
        overallFakePercentage: 0,
        reasons: {}
      };
    } catch (error) {
      console.error('Error detecting fake reviews:', error);
      return {
        fakeReviews: [],
        overallFakePercentage: 0,
        reasons: {}
      };
    }
  }

  private static getFallbackReviewAnalysis(): ReviewAnalysis {
    return {
      sentiment: {
        overall: 'neutral',
        score: 0,
        confidence: 0.5,
        emotions: {}
      },
      topics: {
        acting: 5,
        plot: 5,
        visuals: 5,
        audio: 5,
        pacing: 5,
        characters: 5,
        themes: 5
      },
      authenticity: {
        isFake: false,
        confidence: 0.5,
        reasons: ['Unable to analyze']
      },
      summary: 'Review analysis unavailable',
      keyPoints: [],
      spoilerRisk: 0
    };
  }

  private static getFallbackReviewSummary(): ReviewSummary {
    return {
      overallSentiment: 'mixed',
      consensusPoints: [],
      controversialAspects: [],
      summary: 'Review summary unavailable',
      ratingDistribution: {},
      topPositives: [],
      topNegatives: []
    };
  }
}
