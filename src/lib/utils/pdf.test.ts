import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generatePdfFilename, downloadBlob } from './pdf';
import type { Itinerary } from '@/types';

describe('pdf utilities', () => {
  describe('generatePdfFilename', () => {
    beforeEach(() => {
      // Mock Date to have consistent timestamps
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15T10:30:45'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('generates filename with destination and timestamp', () => {
      const itinerary: Itinerary = {
        id: 'test-1',
        destination: '東京',
        description: 'Test trip',
        days: [],
      };

      const filename = generatePdfFilename(itinerary);
      expect(filename).toBe('東京_20240315_103045.pdf');
    });

    it('sanitizes special characters in destination', () => {
      const itinerary: Itinerary = {
        id: 'test-2',
        destination: 'Tokyo/Paris?Berlin',
        description: 'Multi-city trip',
        days: [],
      };

      const filename = generatePdfFilename(itinerary);
      expect(filename).toBe('Tokyo-Paris-Berlin_20240315_103045.pdf');
    });

    it('handles all special characters that need sanitization', () => {
      const itinerary: Itinerary = {
        id: 'test-3',
        destination: 'A/B\\C?D%E*F:G|H"I<J>K',
        description: 'Special chars test',
        days: [],
      };

      const filename = generatePdfFilename(itinerary);
      expect(filename).toBe('A-B-C-D-E-F-G-H-I-J-K_20240315_103045.pdf');
    });

    it('formats timestamp with zero-padding', () => {
      vi.setSystemTime(new Date('2024-01-05T09:05:03'));

      const itinerary: Itinerary = {
        id: 'test-4',
        destination: 'Paris',
        description: 'Paris trip',
        days: [],
      };

      const filename = generatePdfFilename(itinerary);
      expect(filename).toBe('Paris_20240105_090503.pdf');
    });
  });

  describe('downloadBlob', () => {
    let mockLink: HTMLAnchorElement;
    let appendChildSpy: ReturnType<typeof vi.spyOn>;
    let removeChildSpy: ReturnType<typeof vi.spyOn>;
    let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      } as unknown as HTMLAnchorElement;

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('creates download link and triggers download', () => {
      const blob = new Blob(['test content'], { type: 'application/pdf' });
      const filename = 'test.pdf';

      downloadBlob(blob, filename);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe(filename);
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('creates object URL and cleans up after download', () => {
      const blob = new Blob(['test content'], { type: 'application/pdf' });

      downloadBlob(blob, 'test.pdf');

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('sets href to object URL', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });

      downloadBlob(blob, 'file.txt');

      expect(mockLink.href).toBe('blob:mock-url');
    });
  });
});
