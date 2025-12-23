import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiService } from '../gemini';

// Mock GoogleGenerativeAI
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent,
  startChat: vi.fn(() => ({
      sendMessage: vi.fn(async () => ({ response: { text: () => "Chat response" } }))
  }))
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel
  }))
}));

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(() => {
    service = new GeminiService('fake-api-key');
    vi.clearAllMocks();
  });

  it('generates a valid itinerary from valid JSON response', async () => {
    const mockResponse = {
      text: () => JSON.stringify({
        id: 'test-trip',
        destination: 'Kyoto',
        heroImage: 'http://example.com/img.jpg',
        description: 'A trip to Kyoto',
        days: [],
        references: []
      })
    };
    mockGenerateContent.mockResolvedValue({ response: mockResponse });

    const result = await service.generateItinerary('Kyoto trip', []);
    
    expect(result.destination).toBe('Kyoto');
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('handles markdown code blocks in JSON response', async () => {
    const mockResponse = {
      text: () => "```json\n" + JSON.stringify({
        id: 'test-trip',
        destination: 'Kyoto'
      }) + "\n```"
    };
    mockGenerateContent.mockResolvedValue({ response: mockResponse });

    const result = await service.generateItinerary('Kyoto trip', []);
    expect(result.destination).toBe('Kyoto');
  });

  it('throws error on invalid JSON', async () => {
    const mockResponse = {
      text: () => "Not JSON"
    };
    mockGenerateContent.mockResolvedValue({ response: mockResponse });

    await expect(service.generateItinerary('Kyoto trip', [])).rejects.toThrow();
  });
});
