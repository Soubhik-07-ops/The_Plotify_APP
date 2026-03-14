/**
 * News Service
 * Fetches India-specific real estate news from NewsAPI.org
 * Includes caching with AsyncStorage for performance
 * 
 * News Refresh Schedule:
 * - Cache expires after 6 hours
 * - News automatically refreshes when:
 *   1. App is opened and cache has expired (>6 hours old)
 *   2. User manually pulls to refresh (if implemented)
 *   3. Cache is cleared manually
 * - This means news updates approximately 4 times per day
 * - Fresh news is fetched from NewsAPI when cache expires
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  image: string;
  date: string;
  content: string;
  url?: string;
  source?: string;
}

const NEWS_CACHE_KEY = '@restate_news_cache';
// Cache expires after 6 hours - news refreshes automatically when cache expires
// News is fetched: 1) On app launch (if cache expired), 2) When user pulls to refresh, 3) Every 6 hours automatically
const NEWS_CACHE_EXPIRY = 6 * 60 * 60 * 1000; // 6 hours in milliseconds (news refreshes ~4 times per day)
const NEWS_API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY || '';
const NEWS_API_URL = 'https://newsapi.org/v2/everything';

/**
 * Get emoji based on article title/keywords
 */
const getArticleEmoji = (title: string): string => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('trend') || lowerTitle.includes('market')) return '📈';
  if (lowerTitle.includes('tip') || lowerTitle.includes('guide') || lowerTitle.includes('advice')) return '💡';
  if (lowerTitle.includes('investment') || lowerTitle.includes('invest')) return '💰';
  if (lowerTitle.includes('home') || lowerTitle.includes('house') || lowerTitle.includes('property')) return '🏠';
  if (lowerTitle.includes('tax') || lowerTitle.includes('finance')) return '📊';
  if (lowerTitle.includes('smart') || lowerTitle.includes('technology')) return '🏡';
  return '📰';
};

/**
 * Format date to relative time (e.g., "2 days ago")
 */
const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Fetch news from NewsAPI.org
 * Falls back to cached data if API fails
 */
export const fetchNews = async (): Promise<NewsArticle[]> => {
  try {
    // Check cache first
    const cachedData = await AsyncStorage.getItem(NEWS_CACHE_KEY);
    if (cachedData) {
      const { articles, timestamp } = JSON.parse(cachedData);
      const now = Date.now();
      if (now - timestamp < NEWS_CACHE_EXPIRY) {
        console.log('📰 Using cached news articles');
        return articles;
      }
    }

    // If no API key, return empty array (graceful degradation)
    if (!NEWS_API_KEY || NEWS_API_KEY === '') {
      console.warn('⚠️ NEWS_API_KEY not configured. Using fallback news.');
      return getFallbackNews();
    }

    // Fetch from NewsAPI - India-specific real estate news
    // Using a simpler query that NewsAPI handles better
    // Query focuses on Indian real estate market
    const query = 'real estate India OR property India OR housing market India OR Indian real estate OR property market India';
    // Sort by latest, English language, get more results to filter
    const url = `${NEWS_API_URL}?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&pageSize=20&apiKey=${NEWS_API_KEY}`;

    console.log('🌐 Fetching news from NewsAPI...');
    console.log('📡 API URL:', url.replace(NEWS_API_KEY, 'API_KEY_HIDDEN'));

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ NewsAPI error:', response.status, errorText);
      throw new Error(`NewsAPI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    console.log('📊 NewsAPI response:', {
      status: data.status,
      totalResults: data.totalResults,
      articlesReceived: data.articles?.length || 0
    });

    if (!data.articles || data.articles.length === 0) {
      console.warn('⚠️ No articles from NewsAPI, using fallback');
      return getFallbackNews();
    }

    // Transform NewsAPI articles to our format
    // Filter to ensure articles are India-related (check title/description for India keywords)
    const indiaKeywords = ['india', 'indian', 'mumbai', 'delhi', 'bangalore', 'chennai', 'hyderabad', 'pune', 'kolkata', 'noida', 'gurgaon', 'ahmedabad', '₹', 'rupee', 'rs.', 'rs ', 'inr'];
    const filteredArticles = data.articles.filter((article: any) => {
      if (!article.title || !article.description) return false;
      // Check if article mentions India-related terms
      const text = `${article.title} ${article.description || ''}`.toLowerCase();
      return indiaKeywords.some(keyword => text.includes(keyword));
    });

    console.log(`🔍 Filtered ${filteredArticles.length} India-related articles from ${data.articles.length} total`);

    if (filteredArticles.length === 0) {
      console.warn('⚠️ No India-related articles found, using fallback');
      return getFallbackNews();
    }

    // Helper: strip NewsAPI truncation suffix e.g. "[+2363 chars]" and return full available text
    const buildFullContent = (art: any): string => {
      const desc = (art.description || '').trim();
      let cont = (art.content || '').trim();
      cont = cont.replace(/\s*\[\+\d+\s*chars\]\s*$/i, '').trim(); // remove "[+2363 chars]" etc.
      if (desc && cont) return `${desc}\n\n${cont}`;
      return cont || desc || art.title || 'Real Estate News';
    };

    const articles: NewsArticle[] = filteredArticles
      .slice(0, 5)
      .map((article: any, index: number) => ({
        id: `news_${index}_${Date.now()}`,
        title: article.title || 'Real Estate News',
        summary: article.description || article.content?.substring(0, 150) || 'Read more about real estate trends.',
        image: getArticleEmoji(article.title),
        date: formatRelativeDate(article.publishedAt),
        content: buildFullContent(article),
        url: article.url,
        source: article.source?.name || 'News',
      }));

    // Cache the results
    const cacheData = {
      articles,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(cacheData));

    console.log('✅ Fetched and cached', articles.length, 'news articles from NewsAPI');
    console.log('📰 Article titles:', articles.map(a => a.title));
    return articles;
  } catch (error) {
    console.error('❌ Error fetching news:', error);

    // Try to return cached data even if expired
    try {
      const cachedData = await AsyncStorage.getItem(NEWS_CACHE_KEY);
      if (cachedData) {
        const { articles } = JSON.parse(cachedData);
        console.log('📰 Using expired cache as fallback');
        return articles;
      }
    } catch (cacheError) {
      console.error('Error reading cache:', cacheError);
    }

    // Final fallback
    return getFallbackNews();
  }
};

/**
 * Fallback news articles (used when API is unavailable)
 * These are generic real estate articles
 */
const getFallbackNews = (): NewsArticle[] => {
  return [
    {
      id: 'fallback_1',
      title: 'Real Estate Market Trends for 2025',
      summary: 'Discover the latest trends shaping the property market this year',
      image: '📈',
      date: '2 days ago',
      content: `# Real Estate Market Trends for 2025

The real estate market in 2025 is experiencing unprecedented changes driven by technology, changing lifestyle preferences, and economic factors.

## Key Trends to Watch

### 1. Smart Home Technology Integration
Modern buyers are increasingly looking for properties equipped with smart home features. From automated lighting systems to AI-powered security, these technologies are becoming standard expectations rather than luxury additions.

### 2. Sustainable Living Focus
Environmental consciousness is driving demand for eco-friendly properties. Solar panels, energy-efficient appliances, and sustainable building materials are top priorities for today's buyers.

### 3. Remote Work Spaces
The hybrid work model has created demand for properties with dedicated office spaces. Home offices, co-working areas, and flexible room designs are highly sought after.

*Stay updated with the latest market insights.*`,
    },
    {
      id: 'fallback_2',
      title: 'Top Home Buying Tips for First-Time Buyers',
      summary: 'Essential advice for making your first property purchase successful',
      image: '💡',
      date: '1 week ago',
      content: `# Top 10 Home Buying Tips for First-Time Buyers

Buying your first home is an exciting milestone, but it can also feel overwhelming. Here are essential tips to help you navigate the process successfully.

## Before You Start Looking

### 1. Check Your Credit Score
Your credit score significantly impacts your mortgage rates. Aim for a score of 620 or higher for better loan terms.

### 2. Save for Down Payment
While some programs offer low down payment options, having 10-20% saved can provide better rates and terms.

### 3. Get Pre-Approved
Pre-approval gives you a clear budget and shows sellers you're a serious buyer.

*Remember, buying a home is a marathon, not a sprint. Take your time and make informed decisions.*`,
    },
    {
      id: 'fallback_3',
      title: 'Investment Properties: What You Need to Know',
      summary: 'A comprehensive guide to building wealth through real estate',
      image: '💰',
      date: '3 days ago',
      content: `# Investment Properties: What You Need to Know

Real estate investment can be a powerful wealth-building strategy when approached with knowledge and preparation.

## Types of Investment Properties

### Rental Properties
Traditional buy-and-hold strategy where you purchase properties to rent out for steady cash flow.

**Pros:**
- Steady monthly income
- Property appreciation over time
- Tax benefits and deductions

**Cons:**
- Property management responsibilities
- Vacancy risks
- Maintenance costs

*Success in real estate investment requires patience, education, and strategic planning.*`,
    },
  ];
};

/**
 * Clear news cache (useful for testing or forced refresh)
 * Call this to force fresh news fetch on next app open
 */
export const clearNewsCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(NEWS_CACHE_KEY);
    console.log('✅ News cache cleared - next fetch will get fresh news');
  } catch (error) {
    console.error('Error clearing news cache:', error);
  }
};

/**
 * Force refresh news (clears cache and fetches fresh)
 * Use this to immediately get new news
 */
export const forceRefreshNews = async (): Promise<NewsArticle[]> => {
  await clearNewsCache();
  return fetchNews();
};

/**
 * Check if news cache exists and when it expires
 * Useful for debugging
 */
export const getNewsCacheInfo = async (): Promise<{ exists: boolean; age: number; expiresIn: number } | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(NEWS_CACHE_KEY);
    if (!cachedData) {
      return { exists: false, age: 0, expiresIn: 0 };
    }
    const { timestamp } = JSON.parse(cachedData);
    const age = Date.now() - timestamp;
    const expiresIn = NEWS_CACHE_EXPIRY - age;
    return {
      exists: true,
      age: Math.floor(age / 1000 / 60), // age in minutes
      expiresIn: Math.floor(expiresIn / 1000 / 60), // expires in minutes
    };
  } catch (error) {
    console.error('Error getting cache info:', error);
    return null;
  }
};
