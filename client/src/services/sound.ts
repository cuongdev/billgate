
// Singleton AudioContext
let audioCtx: AudioContext | null = null;

const SESSION_KEY = 'SOUND_UNLOCKED';

// Singleton Audio element for playback reuse
let player: HTMLAudioElement | null = null;

function getContext() {
    if (!audioCtx) {
        // @ts-ignore - Handle various browser implementations
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new Ctx();
    }
    return audioCtx;
}

function getPlayer() {
    if (!player) {
        player = new Audio();
    }
    return player;
}

export const soundService = {
    isUnlocked: () => {
        if (typeof window === 'undefined') return false;
        // Check both session storage and current context state if possible
        // But user requirement is primarily session-based logic for UI
        return sessionStorage.getItem(SESSION_KEY) === '1';
    },

    initSound: async (): Promise<boolean> => {
        try {
            const ctx = getContext();
            
            // Resume context (Standard requirement for Chrome autoplay)
            await ctx.resume();

            // Create a short silent beep to confirm interaction/unlock
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            // Very low volume, short duration
            gainNode.gain.value = 0.01; 
            oscillator.frequency.value = 440;
            
            oscillator.start(0);
            oscillator.stop(0.1);

            if (ctx.state === 'running') {
                sessionStorage.setItem(SESSION_KEY, '1');
                return true;
            }
            return false;
        } catch (e) {
            console.error('[SoundService] Init failed', e);
            return false;
        }
    },

    playNotificationSound: async (url: string) => {
        // Silent fail if not unlocked (User Requirement 5)
        if (sessionStorage.getItem(SESSION_KEY) !== '1') {
            console.warn('[SoundService] Audio skipped - not unlocked yet');
            return;
        }

        try {
            const p = getPlayer();
            
            // Reset player (User Requirement 2)
            p.pause();
            p.currentTime = 0;
            p.src = url;
            
            await p.play();
            console.log('[SoundService] Audio playing:', url);
        } catch (e) {
            console.error('[SoundService] Playback failed', e);
        }
    }
};
