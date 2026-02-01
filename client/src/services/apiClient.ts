import { eventBus, EVENTS } from '../utils/EventBus';

export const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('accessToken');
    
    // Debug token presence
    if (!token) {
        console.warn('[apiFetch] No token found in localStorage for URL:', url);
    } else {
        console.log('[apiFetch] Token found, length:', token.length);
    }

    // Construct headers meticulously
    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Merge with user options
    let mergedHeaders: HeadersInit = { ...defaultHeaders };
    
    if (options.headers) {
        if (options.headers instanceof Headers) {
             console.warn('[apiFetch] options.headers is Headers instance, might lose default headers if not careful');
             options.headers.forEach((v, k) => {
                 // @ts-ignore
                 mergedHeaders[k] = v;
             });
        } else if (Array.isArray(options.headers)) {
             // array of [key, value]
             options.headers.forEach(([k, v]) => {
                 // @ts-ignore
                 mergedHeaders[k] = v;
             });
        } else {
             // Plain object
             mergedHeaders = {
                 ...defaultHeaders,
                 ...options.headers
             };
        }
    }

    console.log('[apiFetch] Final Headers:', mergedHeaders);

    const response = await fetch(url, { 
        ...options, 
        headers: mergedHeaders 
    });

    // Global Error Handling
    if (response.status === 401) {
        console.error('[apiFetch] 401 Unauthorized. Server rejected token.');
        eventBus.emit(EVENTS.SESSION_EXPIRED);
    }

    return response;
};
