import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TravelPlanner from '@/components/TravelPlanner'
import '@testing-library/user-event'

// Mock Image component since it's lazy loaded and might cause issues in simple jest/vitest environment
vi.mock('next/image', () => ({
    default: (props: any) => <img {...props} />
}));

describe('TravelPlanner Component', () => {
    
    it('renders the initial form', () => {
        render(<TravelPlanner />)
        expect(screen.getByText('目的地')).toBeDefined()
        expect(screen.getByText('日程')).toBeDefined()
        expect(screen.getByText('誰と？')).toBeDefined()
        expect(screen.getByRole('button', { name: 'プランを作成する' })).toBeDefined()
    })

    it('allows typing in destination', () => {
        render(<TravelPlanner />)
        const destinationInput = screen.getByPlaceholderText('例: パリ, 東京, 北海道...')
        fireEvent.change(destinationInput, { target: { value: 'Paris' } })
        expect((destinationInput as HTMLInputElement).value).toBe('Paris')
    })

    it('disables submit button when destination is empty', () => {
        render(<TravelPlanner />)
        const button = screen.getByRole('button', { name: 'プランを作成する' })
        expect((button as HTMLButtonElement).disabled).toBe(true)
        
        const destinationInput = screen.getByPlaceholderText('例: パリ, 東京, 北海道...')
        fireEvent.change(destinationInput, { target: { value: 'Paris' } })
        expect((button as HTMLButtonElement).disabled).toBe(false)
    })

    it('selects theme options', () => {
        render(<TravelPlanner />)
        const gourmetButton = screen.getByText('グルメ')
        fireEvent.click(gourmetButton)
        expect(gourmetButton.className).toContain('bg-white')
        expect(gourmetButton.className).not.toContain('bg-white/10')
    })
    
    it('shows loading state after submission', async () => {
        vi.useFakeTimers()
        render(<TravelPlanner />)
        
        const destinationInput = screen.getByPlaceholderText('例: パリ, 東京, 北海道...')
        fireEvent.change(destinationInput, { target: { value: 'Paris' } })
        
        const button = screen.getByRole('button', { name: 'プランを作成する' })
        fireEvent.click(button)

        expect(screen.getByRole('status')).toBeDefined() 
        expect(screen.getByText(/AI Analysis Active/i)).toBeDefined()
        
        vi.runAllTimers()
        vi.useRealTimers()
    })

   // Note: Full integration test waiting for 6000ms timeout might be flaky or require long timeout mock
   // For unit test, we verify it enters loading.
})
