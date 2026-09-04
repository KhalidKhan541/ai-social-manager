import {
  emailSchema,
  passwordSchema,
  usernameSchema,
  loginSchema,
  registerSchema,
  postContentSchema,
  campaignSchema,
  calendarEntrySchema,
  sanitizeContent,
  extractHashtags,
  extractMentions,
  calculateReadingTime,
  generateExcerpt,
} from '@/lib/validators'

describe('Email Schema', () => {
  it('should accept valid email', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true)
  })

  it('should reject invalid email', () => {
    expect(emailSchema.safeParse('invalid-email').success).toBe(false)
  })

  it('should reject empty string', () => {
    expect(emailSchema.safeParse('').success).toBe(false)
  })

  it('should reject email without domain', () => {
    expect(emailSchema.safeParse('user@').success).toBe(false)
  })

  it('should accept email with subdomain', () => {
    expect(emailSchema.safeParse('user@mail.example.com').success).toBe(true)
  })

  it('should reject email over 255 chars', () => {
    const longEmail = 'a'.repeat(250) + '@example.com'
    expect(emailSchema.safeParse(longEmail).success).toBe(false)
  })
})

describe('Password Schema', () => {
  it('should accept valid password', () => {
    expect(passwordSchema.safeParse('StrongP@ss1').success).toBe(true)
  })

  it('should reject short password', () => {
    expect(passwordSchema.safeParse('Sh@1x').success).toBe(false)
  })

  it('should reject password without uppercase', () => {
    expect(passwordSchema.safeParse('strongp@ss1').success).toBe(false)
  })

  it('should reject password without lowercase', () => {
    expect(passwordSchema.safeParse('STRONGP@SS1').success).toBe(false)
  })

  it('should reject password without number', () => {
    expect(passwordSchema.safeParse('StrongP@ssword').success).toBe(false)
  })

  it('should reject password without special character', () => {
    expect(passwordSchema.safeParse('StrongPass1').success).toBe(false)
  })

  it('should reject password over 128 chars', () => {
    const longPass = 'A'.repeat(120) + '@1a'
    expect(passwordSchema.safeParse(longPass).success).toBe(false)
  })
})

describe('Username Schema', () => {
  it('should accept valid username', () => {
    expect(usernameSchema.safeParse('john_doe').success).toBe(true)
  })

  it('should accept alphanumeric username', () => {
    expect(usernameSchema.safeParse('john123').success).toBe(true)
  })

  it('should reject short username', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false)
  })

  it('should reject username with spaces', () => {
    expect(usernameSchema.safeParse('john doe').success).toBe(false)
  })

  it('should reject username with special chars', () => {
    expect(usernameSchema.safeParse('john@doe').success).toBe(false)
  })

  it('should accept username with underscores', () => {
    expect(usernameSchema.safeParse('john_doe_123').success).toBe(true)
  })
})

describe('Login Schema', () => {
  it('should accept valid login', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password',
    })
    expect(result.success).toBe(true)
  })

  it('should reject login without email', () => {
    const result = loginSchema.safeParse({ password: 'password' })
    expect(result.success).toBe(false)
  })

  it('should reject login without password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(false)
  })

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('Register Schema', () => {
  it('should accept valid registration', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'StrongP@ss1',
      confirmPassword: 'StrongP@ss1',
    })
    expect(result.success).toBe(true)
  })

  it('should reject mismatched passwords', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'StrongP@ss1',
      confirmPassword: 'DifferentP@ss1',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty name', () => {
    const result = registerSchema.safeParse({
      name: '',
      email: 'john@example.com',
      password: 'StrongP@ss1',
      confirmPassword: 'StrongP@ss1',
    })
    expect(result.success).toBe(false)
  })
})

describe('Post Content Schema', () => {
  it('should accept valid post content', () => {
    const result = postContentSchema.safeParse({
      content: 'Hello world!',
      accountId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty content', () => {
    const result = postContentSchema.safeParse({
      content: '',
      accountId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('should reject content over 280 chars', () => {
    const result = postContentSchema.safeParse({
      content: 'a'.repeat(281),
      accountId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid account ID', () => {
    const result = postContentSchema.safeParse({
      content: 'Hello',
      accountId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })
})

describe('Campaign Schema', () => {
  it('should accept valid campaign', () => {
    const result = campaignSchema.safeParse({
      name: 'Summer Sale',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-30'),
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty name', () => {
    const result = campaignSchema.safeParse({
      name: '',
      startDate: new Date('2024-06-01'),
    })
    expect(result.success).toBe(false)
  })

  it('should reject end date before start date', () => {
    const result = campaignSchema.safeParse({
      name: 'Test',
      startDate: new Date('2024-06-30'),
      endDate: new Date('2024-06-01'),
    })
    expect(result.success).toBe(false)
  })

  it('should accept campaign without end date', () => {
    const result = campaignSchema.safeParse({
      name: 'Ongoing',
      startDate: new Date('2024-06-01'),
    })
    expect(result.success).toBe(true)
  })

  it('should accept negative budget', () => {
    const result = campaignSchema.safeParse({
      name: 'Test',
      startDate: new Date(),
      budget: -100,
    })
    expect(result.success).toBe(false)
  })
})

describe('Calendar Entry Schema', () => {
  it('should accept valid calendar entry', () => {
    const result = calendarEntrySchema.safeParse({
      title: 'Meeting post',
      scheduledDate: new Date(),
      platform: 'TWITTER',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty title', () => {
    const result = calendarEntrySchema.safeParse({
      title: '',
      scheduledDate: new Date(),
      platform: 'TWITTER',
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid platform', () => {
    const result = calendarEntrySchema.safeParse({
      title: 'Test',
      scheduledDate: new Date(),
      platform: 'TIKTOK',
    })
    expect(result.success).toBe(false)
  })

  it('should accept valid time format', () => {
    const result = calendarEntrySchema.safeParse({
      title: 'Test',
      scheduledDate: new Date(),
      platform: 'TWITTER',
      scheduledTime: '14:30',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid time format', () => {
    const result = calendarEntrySchema.safeParse({
      title: 'Test',
      scheduledDate: new Date(),
      platform: 'TWITTER',
      scheduledTime: '25:00',
    })
    expect(result.success).toBe(false)
  })

  it('should accept valid color hex', () => {
    const result = calendarEntrySchema.safeParse({
      title: 'Test',
      scheduledDate: new Date(),
      platform: 'TWITTER',
      color: '#FF5733',
    })
    expect(result.success).toBe(true)
  })
})

describe('sanitizeContent', () => {
  it('should remove script tags', () => {
    const input = 'Hello <script>alert("xss")</script> world'
    const result = sanitizeContent(input)
    expect(result).toBe('Hello  world')
  })

  it('should remove HTML tags', () => {
    const input = '<b>Bold</b> and <i>italic</i>'
    const result = sanitizeContent(input)
    expect(result).toBe('Bold and italic')
  })

  it('should remove javascript: protocol', () => {
    const input = 'javascript:alert("xss")'
    const result = sanitizeContent(input)
    expect(result).not.toContain('javascript:')
  })

  it('should remove event handlers', () => {
    const input = '<div onclick="alert()">test</div>'
    const result = sanitizeContent(input)
    expect(result).not.toContain('onclick')
  })

  it('should trim whitespace', () => {
    const input = '  Hello world  '
    const result = sanitizeContent(input)
    expect(result).toBe('Hello world')
  })
})

describe('extractHashtags', () => {
  it('should extract hashtags from content', () => {
    const result = extractHashtags('Check out #tech and #innovation')
    expect(result).toEqual(['#tech', '#innovation'])
  })

  it('should deduplicate hashtags', () => {
    const result = extractHashtags('#tech #tech #tech')
    expect(result).toEqual(['#tech'])
  })

  it('should handle hashtags with unicode', () => {
    const result = extractHashtags('#café #naïve')
    expect(result.length).toBe(2)
  })

  it('should return empty array when no hashtags', () => {
    const result = extractHashtags('No hashtags here')
    expect(result).toEqual([])
  })

  it('should normalize to lowercase', () => {
    const result = extractHashtags('#Tech #TECH')
    expect(result).toEqual(['#tech'])
  })
})

describe('extractMentions', () => {
  it('should extract mentions', () => {
    const result = extractMentions('Hello @john and @jane')
    expect(result).toEqual(['@john', '@jane'])
  })

  it('should deduplicate mentions', () => {
    const result = extractMentions('@john @john @john')
    expect(result).toEqual(['@john'])
  })

  it('should return empty array when no mentions', () => {
    const result = extractMentions('No mentions here')
    expect(result).toEqual([])
  })

  it('should normalize to lowercase', () => {
    const result = extractMentions('@John @JOHN')
    expect(result).toEqual(['@john'])
  })
})

describe('calculateReadingTime', () => {
  it('should calculate reading time', () => {
    const content = 'word '.repeat(200)
    const time = calculateReadingTime(content)
    expect(time).toBe(1)
  })

  it('should handle empty content', () => {
    const time = calculateReadingTime('')
    expect(time).toBe(0)
  })

  it('should round up for longer content', () => {
    const content = 'word '.repeat(450)
    const time = calculateReadingTime(content)
    expect(time).toBe(3)
  })
})

describe('generateExcerpt', () => {
  it('should return full content if short enough', () => {
    const result = generateExcerpt('Short text', 150)
    expect(result).toBe('Short text')
  })

  it('should truncate long content', () => {
    const content = 'a'.repeat(200)
    const result = generateExcerpt(content, 150)
    expect(result.length).toBeLessThanOrEqual(154)
    expect(result).toContain('...')
  })

  it('should cut at word boundary', () => {
    const content = 'Hello world this is a long text'
    const result = generateExcerpt(content, 20)
    expect(result.endsWith('...')).toBe(true)
  })
})
