// Ultra-strict SHAFT-compliant content filtering system
// Implements comprehensive prohibited words detection with variation blocking

import { storage } from './storage';
import type { ContentValidationResult, InsertProhibitedWord, InsertMessageAuditLog, ProhibitedWord } from '@shared/schema';

export interface SHAFTCategories {
  sex: string[];
  hate: string[];
  alcohol: string[];
  firearms: string[];
  tobacco: string[];
  variations: string[]; // Common evasion techniques
}

/**
 * SHAFT-compliant content filter with educational context awareness
 * Implements different policies for educational vs marketing communications
 */
export class ContentFilter {
  private static instance: ContentFilter;
  private prohibitedWordsCache: Map<string, ProhibitedWord> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Comprehensive SHAFT guidelines database
  private static readonly SHAFT_WORDS: SHAFTCategories = {
    // Sex-related content (SHAFT S)
    sex: [
      'sex', 'sexual', 'sexy', 'porn', 'adult', 'xxx', 'nude', 'naked', 'strip', 'escort',
      'prostitute', 'brothel', 'massage', 'dating', 'hookup', 'intimate', 'erotic',
      'fetish', 'kink', 'bdsm', 'orgasm', 'climax', 'arousal', 'seduction', 'foreplay'
    ],

    // Hate speech and discrimination (SHAFT H)
    hate: [
      // Racial slurs and discriminatory terms (partial list - full implementation would be more comprehensive)
      'hate', 'racist', 'nazi', 'supremacist', 'discrimination', 'bigot', 'prejudice',
      'inferior', 'superior', 'ethnic cleansing', 'genocide', 'holocaust denial',
      // Religious hate
      'infidel', 'crusade', 'jihad', 'terrorist', 'extremist',
      // LGBTQ+ slurs and hate speech
      'phobic', 'degenerate', 'abomination', 'unnatural',
      // Disability discrimination
      'retard', 'cripple', 'invalid', 'defective'
    ],

    // Alcohol-related content (SHAFT A)
    alcohol: [
      'alcohol', 'beer', 'wine', 'liquor', 'spirits', 'whiskey', 'vodka', 'gin', 'rum',
      'tequila', 'bourbon', 'scotch', 'champagne', 'cocktail', 'martini', 'margarita',
      'drunk', 'intoxicated', 'wasted', 'hammered', 'tipsy', 'buzzed', 'plastered',
      'brewery', 'distillery', 'bartender', 'bar', 'pub', 'tavern', 'drinking',
      'shots', 'keg', 'flask', 'bottle service', 'happy hour', 'nightclub'
    ],

    // Firearms terms - split by context (marketing vs educational)
    firearms: [
      // Only block promotional/marketing firearms terms, not educational
      'assault rifle', 'military grade', 'combat weapon', 'armory', 'arsenal',
      'automatic weapon', 'gunfire violence', 'gun dealer', 'weapons cache'
    ],

    // Tobacco products (SHAFT T)
    tobacco: [
      'tobacco', 'cigarette', 'cigar', 'smoking', 'nicotine', 'vape', 'vaping',
      'e-cigarette', 'juul', 'pod', 'hookah', 'shisha', 'pipe tobacco', 'chewing tobacco',
      'snuff', 'dip', 'smokeless', 'marlboro', 'camel', 'newport', 'menthol',
      'lighter', 'ashtray', 'smoke break', 'smoking cessation', 'quit smoking'
    ],

    // Variation patterns for evasion detection
    variations: [
      // L33t speak substitutions
      '@', '3', '!', '1', '0', '$', '5', '7', '4', '6', '9',
      // Common spacing/symbol tricks
      '.', '*', '-', '_', '+', '#', '%', '&', '~', '^',
      // Unicode lookalikes
      'а', 'е', 'о', 'р', 'с', 'х', 'у', // Cyrillic letters that look like Latin
    ]
  };

  // Educational allowlist for legitimate firearms training terminology (EMAIL ONLY)
  private static readonly EDUCATIONAL_ALLOWLIST = {
    firearms_training: [
      'gun safety', 'firearm safety', 'shooting range', 'target practice',
      'concealed carry class', 'concealed carry permit', 'concealed carry license',
      'firearms training', 'safety course', 'shooting instruction',
      'range rules', 'marksmanship', 'basic pistol', 'rifle training',
      'handgun training', 'ammunition safety', 'gun handling',
      'shooting fundamentals', 'firearms education', 'safety training',
      'instructor certification', 'qualification course', 'proficiency test',
      'gun course', 'pistol course', 'rifle course', 'shooting course',
      'gun class', 'pistol class', 'rifle class', 'shooting class',
      'gun training', 'pistol training', 'safety class', 'training class',
      'ccw class', 'ccw course', 'ccw training', 'ccw permit',
      'defensive shooting', 'tactical training', 'range training'
    ]
  };

  // Strict firearm tokens that are ALWAYS blocked for SMS regardless of context
  private static readonly STRICT_FIREARM_TOKENS = [
    'gun', 'guns', 'firearm', 'firearms', 'weapon', 'weapons', 
    'ammo', 'ammunition', 'pistol', 'rifle', 'shotgun', 'handgun',
    'caliber', 'magazine', 'clip', 'trigger', 'barrel', 'scope',
    'holster', 'shooting', 'range', 'target practice'
  ];

  // L33t speak translation map
  private static readonly LEET_SPEAK_MAP: { [key: string]: string } = {
    '@': 'a', '4': 'a', '3': 'e', '!': 'i', '1': 'i', '0': 'o', '5': 's', '$': 's',
    '7': 't', '+': 't', '6': 'g', '9': 'g', '2': 'z', '%': 'x', '&': 'and',
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y'
  };

  private constructor() {}

  static getInstance(): ContentFilter {
    if (!ContentFilter.instance) {
      ContentFilter.instance = new ContentFilter();
    }
    return ContentFilter.instance;
  }

  /**
   * Initialize prohibited words database with SHAFT guidelines
   * Super admin only - called during system setup
   */
  async initializeProhibitedWords(adminUserId: string): Promise<void> {
    console.log('Initializing SHAFT-compliant prohibited words database...');
    
    const wordsToInsert: InsertProhibitedWord[] = [];
    
    // Add all SHAFT category words
    Object.entries(ContentFilter.SHAFT_WORDS).forEach(([category, words]) => {
      words.forEach((word: string) => {
        wordsToInsert.push({
          word: word.toLowerCase(),
          category,
          isRegex: false,
          isActive: true,
          severity: 'high',
          description: `SHAFT guidelines - ${category.toUpperCase()} category`,
          addedBy: adminUserId
        });
      });
    });

    // Add regex patterns for variation detection with negative lookbehind for educational content
    const variationPatterns = [
      { word: '(?<!safety\\s)(?<!training\\s)(?<!handling\\s)(?<!course\\s)[g@4][u1!][n7](?!\\s+safety)(?!\\s+training)(?!\\s+course)(?!\\s+handling)', category: 'firearms', description: 'Gun variations (blocks g@n, g1n etc. but allows gun safety, gun training)' },
      { word: '(?<!ammunition\\s)(?<!training\\s)[a@4][m]+[o0][^\\s]*(?!\\s+safety)', category: 'firearms', description: 'Ammo variations (allows ammo safety, ammunition training)' },
      { word: '[s$5][e3][x%]', category: 'sex', description: 'Sex variations (s3x, $ex, etc.)' },
      { word: '[a@4][l1][c][o0][h][o0][l1]', category: 'alcohol', description: 'Alcohol variations' },
      { word: '(?<!training\\s)(?<!range\\s)[g@4][u1!][n7]\\s*[s$5][h][o0][t](?!\\s+training)', category: 'firearms', description: 'Gunshot variations (allows training contexts)' }
    ];

    variationPatterns.forEach(pattern => {
      wordsToInsert.push({
        word: pattern.word,
        category: pattern.category,
        isRegex: true,
        isActive: true,
        severity: 'high',
        description: pattern.description,
        addedBy: adminUserId
      });
    });

    // Batch insert all prohibited words
    await storage.batchInsertProhibitedWords(wordsToInsert);
    
    // Clear cache to force reload
    this.clearCache();
    
    console.log(`Initialized ${wordsToInsert.length} SHAFT-compliant prohibited words`);
  }

  /**
   * Channel-aware message validation with different policies for SMS vs Email
   * SMS: Ultra-strict blocking of ALL firearm terms regardless of context
   * Email: Context-aware filtering that allows educational content
   */
  async validateMessage(
    content: string, 
    instructorId: string, 
    options: {
      channel?: 'sms' | 'email';
      purpose?: 'educational' | 'marketing' | 'administrative';
    } = {}
  ): Promise<ContentValidationResult> {
    const { channel = 'email', purpose = 'educational' } = options;
    const violations: Array<{
      word: string;
      category: string;
      severity: string;
      matchType: 'exact' | 'variation' | 'regex';
    }> = [];

    // Normalize content for analysis
    const normalizedContent = this.normalizeText(content);
    const leetDecoded = this.decodeLeetSpeak(normalizedContent);
    
    // Get prohibited words (cached)
    const prohibitedWords = await this.getProhibitedWords();
    
    // Channel-aware firearm filtering logic
    const hasEducationalContext = channel === 'email' ? this.hasEducationalFirearmsContext(normalizedContent) : false;
    
    // For SMS: Apply strict firearm filtering ONLY for marketing, allow educational content
    if (channel === 'sms' && purpose !== 'educational') {
      for (const token of ContentFilter.STRICT_FIREARM_TOKENS) {
        // Check exact matches and variations for each strict token
        const firearmViolation = this.checkStrictFirearmToken(normalizedContent, leetDecoded, token);
        if (firearmViolation) {
          violations.push(firearmViolation);
        }
      }
    }
    
    // For educational SMS: Check for educational context like email does
    const smsEducationalContext = channel === 'sms' && purpose === 'educational' ? 
      this.hasEducationalFirearmsContext(normalizedContent) : false;
    
    // Check against all prohibited words
    for (const prohibitedWord of prohibitedWords) {
      if (!prohibitedWord.isActive) continue;

      // Channel-specific firearm filtering
      if (prohibitedWord.category === 'firearms') {
        if (channel === 'sms') {
          // SMS: Block firearm terms EXCEPT for educational purpose with valid context
          if (purpose === 'educational' && smsEducationalContext) {
            continue; // Skip firearm filtering for valid educational SMS
          }
          const firearmViolation = this.checkFirearmViolation(normalizedContent, leetDecoded, prohibitedWord);
          if (firearmViolation) {
            violations.push(firearmViolation);
          }
          continue;
        } else if (channel === 'email') {
          // EMAIL: Context-aware filtering with educational allowlist
          if (purpose === 'educational' && hasEducationalContext) {
            continue; // Skip firearm filtering for educational email content
          }
          if (purpose === 'marketing') {
            const firearmViolation = this.checkFirearmViolation(normalizedContent, leetDecoded, prohibitedWord);
            if (firearmViolation) {
              violations.push(firearmViolation);
            }
            continue;
          }
        }
      }

      if (prohibitedWord.isRegex) {
        // Enhanced regex pattern matching with educational exceptions
        const regex = new RegExp(prohibitedWord.word, 'gi');
        if (regex.test(normalizedContent) || regex.test(leetDecoded)) {
          // For firearm regex patterns, check if it's in educational context
          if (prohibitedWord.category === 'firearms' && hasEducationalContext) {
            continue; // Skip this violation for educational content
          }
          violations.push({
            word: prohibitedWord.word,
            category: prohibitedWord.category,
            severity: prohibitedWord.severity,
            matchType: 'regex'
          });
        }
      } else {
        // Exact and variation matching with educational exceptions
        const wordPattern = prohibitedWord.word.toLowerCase();
        
        // Check exact match
        if (normalizedContent.includes(wordPattern)) {
          // For firearm terms, check educational context
          if (prohibitedWord.category === 'firearms' && hasEducationalContext) {
            continue;
          }
          violations.push({
            word: prohibitedWord.word,
            category: prohibitedWord.category,
            severity: prohibitedWord.severity,
            matchType: 'exact'
          });
        }
        
        // Check l33t speak decoded version
        if (leetDecoded.includes(wordPattern)) {
          if (prohibitedWord.category === 'firearms' && hasEducationalContext) {
            continue;
          }
          violations.push({
            word: prohibitedWord.word,
            category: prohibitedWord.category,
            severity: prohibitedWord.severity,
            matchType: 'variation'
          });
        }

        // Check spaced variations (g.u.n, g u n, g-u-n) with proper escaping
        const escapedPattern = this.escapeRegExp(wordPattern).split('').join('[\\s\\-\\._\\*]*');
        const spacedRegex = new RegExp(escapedPattern, 'gi');
        if (spacedRegex.test(normalizedContent)) {
          if (prohibitedWord.category === 'firearms' && hasEducationalContext) {
            continue;
          }
          violations.push({
            word: prohibitedWord.word,
            category: prohibitedWord.category,
            severity: prohibitedWord.severity,
            matchType: 'variation'
          });
        }
      }
    }

    const isValid = violations.length === 0;
    const blockedReason = violations.length > 0 
      ? `Message contains ${violations.length} prohibited term(s): ${violations.map(v => v.word).join(', ')}`
      : undefined;

    return {
      isValid,
      violations,
      blockedReason
    };
  }

  /**
   * Log message attempt for compliance audit
   */
  async logMessageAttempt(
    instructorId: string,
    messageContent: string,
    recipients: string[],
    messageType: string,
    validationResult: ContentValidationResult,
    twilioMessageSid?: string
  ): Promise<void> {
    const auditLog: InsertMessageAuditLog = {
      instructorId,
      messageContent,
      intendedRecipients: recipients,
      recipientCount: recipients.length,
      messageType,
      status: validationResult.isValid ? 'sent' : 'blocked',
      blockedReason: validationResult.blockedReason,
      prohibitedWords: validationResult.violations.map(v => v.word),
      twilioMessageSid,
      deliveryStatus: validationResult.isValid ? 'pending' : undefined,
      errorMessage: validationResult.isValid ? undefined : 'Content policy violation'
    };

    await storage.insertMessageAuditLog(auditLog);
  }

  /**
   * Normalize text for consistent analysis
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Escape special regex characters to treat them as literals
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Decode l33t speak to normal text with proper escaping
   */
  private decodeLeetSpeak(text: string): string {
    let decoded = text;
    Object.entries(ContentFilter.LEET_SPEAK_MAP).forEach(([leet, normal]) => {
      decoded = decoded.replace(new RegExp(this.escapeRegExp(leet), 'g'), normal);
    });
    return decoded;
  }

  /**
   * Check if content contains educational firearms context
   */
  private hasEducationalFirearmsContext(normalizedContent: string): boolean {
    const educationalTerms = ContentFilter.EDUCATIONAL_ALLOWLIST.firearms_training;
    
    // Check if any educational terms are present
    for (const term of educationalTerms) {
      if (normalizedContent.includes(term.toLowerCase())) {
        return true;
      }
    }
    
    // Additional educational context indicators
    const educationalContexts = [
      'training', 'course', 'class', 'instruction', 'education', 'safety', 
      'certification', 'permit', 'license', 'qualification', 'instructor',
      'student', 'learn', 'teach', 'practice', 'range', 'rules', 'fundamentals',
      'ccw', 'concealed carry', 'defensive', 'tactical', 'marksmanship',
      'proficiency', 'examination', 'test', 'requirements', 'curriculum'
    ];
    
    // Must have at least 2 educational context indicators for strong confidence
    const contextMatches = educationalContexts.filter(context => normalizedContent.includes(context));
    return contextMatches.length >= 2;
  }

  /**
   * Check strict firearm token violations for SMS (blocks ALL firearm terms regardless of context)
   */
  private checkStrictFirearmToken(normalizedContent: string, leetDecoded: string, token: string): any | null {
    // Check exact matches
    if (normalizedContent.includes(token.toLowerCase()) || leetDecoded.includes(token.toLowerCase())) {
      return {
        word: token,
        category: 'firearms',
        severity: 'high',
        matchType: 'strict_sms_block' as const
      };
    }

    // Check spaced variations (g.u.n, g u n, g-u-n) with proper escaping
    const escapedPattern = this.escapeRegExp(token).split('').join('[\\s\\-\\._\\*]*');
    const spacedRegex = new RegExp(escapedPattern, 'gi');
    if (spacedRegex.test(normalizedContent)) {
      return {
        word: token,
        category: 'firearms',
        severity: 'high',
        matchType: 'strict_sms_block' as const
      };
    }

    // Check l33t speak variations
    const leetVariations = [
      token.replace(/g/g, '[g@4]').replace(/u/g, '[u1!]').replace(/n/g, '[n7]'),
      token.replace(/a/g, '[a@4]').replace(/e/g, '[e3]').replace(/i/g, '[i1!]').replace(/o/g, '[o0]').replace(/s/g, '[s5$]')
    ];
    
    for (const variation of leetVariations) {
      const variationRegex = new RegExp(variation, 'gi');
      if (variationRegex.test(normalizedContent)) {
        return {
          word: token,
          category: 'firearms', 
          severity: 'high',
          matchType: 'strict_sms_block' as const
        };
      }
    }

    return null;
  }

  /**
   * Check firearm violations for marketing content
   */
  private checkFirearmViolation(normalizedContent: string, leetDecoded: string, prohibitedWord: any): any | null {
    if (prohibitedWord.isRegex) {
      const regex = new RegExp(prohibitedWord.word, 'gi');
      if (regex.test(normalizedContent) || regex.test(leetDecoded)) {
        return {
          word: prohibitedWord.word,
          category: prohibitedWord.category,
          severity: prohibitedWord.severity,
          matchType: 'regex' as const
        };
      }
    } else {
      const wordPattern = prohibitedWord.word.toLowerCase();
      
      if (normalizedContent.includes(wordPattern) || leetDecoded.includes(wordPattern)) {
        return {
          word: prohibitedWord.word,
          category: prohibitedWord.category,
          severity: prohibitedWord.severity,
          matchType: 'exact' as const
        };
      }
      
      // Check spaced variations
      const escapedPattern = this.escapeRegExp(wordPattern).split('').join('[\\s\\-\\._\\*]*');
      const spacedRegex = new RegExp(escapedPattern, 'gi');
      if (spacedRegex.test(normalizedContent)) {
        return {
          word: prohibitedWord.word,
          category: prohibitedWord.category,
          severity: prohibitedWord.severity,
          matchType: 'variation' as const
        };
      }
    }
    
    return null;
  }

  /**
   * Get prohibited words with caching
   */
  private async getProhibitedWords(): Promise<ProhibitedWord[]> {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.CACHE_TTL || this.prohibitedWordsCache.size === 0) {
      const words = await storage.getActiveProhibitedWords();
      this.prohibitedWordsCache.clear();
      words.forEach(word => this.prohibitedWordsCache.set(word.id, word));
      this.lastCacheUpdate = now;
    }
    return Array.from(this.prohibitedWordsCache.values());
  }

  /**
   * Clear cache - used when prohibited words are updated
   */
  clearCache(): void {
    this.prohibitedWordsCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Add new prohibited word (super admin only)
   */
  async addProhibitedWord(
    word: string,
    category: string,
    adminUserId: string,
    isRegex: boolean = false,
    description?: string
  ): Promise<void> {
    const prohibitedWord: InsertProhibitedWord = {
      word: word.toLowerCase(),
      category,
      isRegex,
      isActive: true,
      severity: 'high',
      description: description || `Manual addition - ${category}`,
      addedBy: adminUserId
    };

    await storage.insertProhibitedWord(prohibitedWord);
    this.clearCache();
  }

  /**
   * Get comprehensive compliance report
   */
  async getComplianceReport(dateFrom: Date, dateTo: Date): Promise<{
    totalAttempts: number;
    blockedAttempts: number;
    sentMessages: number;
    topViolations: Array<{ word: string; count: number; category: string }>;
    instructorStats: Array<{ instructorId: string; attempts: number; blocked: number }>;
  }> {
    return await storage.getMessageComplianceReport(dateFrom, dateTo);
  }
}

// Singleton export
export const contentFilter = ContentFilter.getInstance();