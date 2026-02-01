import React, { createContext, useContext, useEffect, useState } from 'react';
import {
	User,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
	signInWithPopup,
	signInWithRedirect,
	getRedirectResult,
	setPersistence,
	browserLocalPersistence,
	sendPasswordResetEmail,
	updateProfile as firebaseUpdateProfile,
	updatePassword as firebaseUpdatePassword
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface AuthContextType {
	currentUser: User | null;
	loading: boolean;
	authReady: boolean;
	backendError: string | null;
	login: (email: string, password: string) => Promise<void>;
	register: (email: string, password: string) => Promise<void>;
	loginWithGoogle: () => Promise<void>;
	logout: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	updateUserProfile: (displayName?: string, photoURL?: string) => Promise<void>;
	updateUserPassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [authReady, setAuthReady] = useState(false);
	const [backendError, setBackendError] = useState<string | null>(null);

	useEffect(() => {
		let unsubscribe: (() => void) | undefined;

		const initializeAuth = async () => {
			console.log('[AuthContext] 🚀 initializeAuth started');

			try {
				console.log('[AuthContext] Setting persistence...');
				await setPersistence(auth, browserLocalPersistence);
				console.log('[AuthContext] Persistence set to browserLocalPersistence SUCCESS');
			} catch (err: any) {
				console.error('[AuthContext] Persistence Failed:', err.code, err.message);
			}

			try {
				console.log('[AuthContext] Checking getRedirectResult (Legacy Flow)...');
				const result = await getRedirectResult(auth);
				console.log('[AuthContext] getRedirectResult result:', result ? `User: ${result.user.uid}` : 'null (Expected if using Popup)');
				if (result) {
					console.log('[AuthContext] Redirect Login Successful (Recovered), processing...');
					await processLogin(result.user);
				}
			} catch (err: any) {
				console.error('[AuthContext] getRedirectResult Failed:', err.code, err.message);
			}

			console.log('[AuthContext] Subscribing to onAuthStateChanged...');
			unsubscribe = onAuthStateChanged(auth, async (user) => {
				console.log('[AuthContext] onAuthStateChanged fired. User:', user ? user.uid : 'null');

				if (user) {
					setLoading(true);
					setAuthReady(false);
				}

				setCurrentUser(user);

				if (user) {
					const existingToken = localStorage.getItem('accessToken');
					if (!existingToken) {
						console.log('[AuthContext] User restored but no token found, exchanging now...');
						try {
							await processLogin(user);
						} catch (e) {
							console.error('[AuthContext] Failed to restore backend session:', e);
						}
					} else {
						console.log('[AuthContext] User restored and token exists.');
					}
				}

				setLoading(false);
				setAuthReady(true);
				console.log('[AuthContext] Loading set to false (Auth Ready)');
			});
		};

		initializeAuth();

		return () => {
			if (unsubscribe) unsubscribe();
		};
	}, []);

	const login = async (email: string, password: string) => {
		await signInWithEmailAndPassword(auth, email, password);
	};

	const register = async (email: string, password: string) => {
		await createUserWithEmailAndPassword(auth, email, password);
	};

	const processLogin = async (firebaseUser: User) => {
		setBackendError(null);
		try {
			const idToken = await firebaseUser.getIdToken();
			const apiBase = import.meta.env.VITE_API_URL || '';

			console.log('[AuthContext] exchanging Access Token with backend...');
			const response = await fetch(`${apiBase}/api/auth/firebase`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken })
			});

			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(errData.error || 'Backend Auth Failed');
			}

			const responseData = await response.json();
			if (responseData.data && responseData.data.token) {
				localStorage.setItem('accessToken', responseData.data.token);
				console.log('[AuthContext] Backend authentication successful');
			} else if (responseData.token) {
				localStorage.setItem('accessToken', responseData.token);
			} else {
				console.error('[AuthContext] Token missing in response:', responseData);
				throw new Error('Token missing in backend response');
			}
		} catch (err: any) {
			console.error('[AuthContext] Backend Exchange Error:', err);
			setBackendError(err.message);
		}
	};

	const loginWithGoogle = async () => {
		try {
			if (!import.meta.env.VITE_FIREBASE_API_KEY) throw new Error('Missing API Key');

			console.log('[AuthContext] Attempting Google Sign-In via POPUP...');
			try {
				const result = await signInWithPopup(auth, googleProvider);
				console.log('[AuthContext] Popup Login Success. User:', result.user.uid);
				await processLogin(result.user);
			} catch (popupError: any) {
				console.warn('[AuthContext] Popup failed/closed. Code:', popupError.code);

				const fallbackCodes = [
					'auth/popup-blocked',
					'auth/popup-closed-by-user',
					'auth/cancelled-popup-request',
					'auth/network-request-failed'
				];

				if (fallbackCodes.includes(popupError.code)) {
					console.log('[AuthContext] Falling back to REDIRECT method...');
					await signInWithRedirect(auth, googleProvider);
				} else {
					throw popupError;
				}
			}
		} catch (error: any) {
			console.error('Login Error (Popup & Redirect):', error);
			throw error;
		}
	};

	const logout = async () => {
		localStorage.removeItem('accessToken');
		await signOut(auth);
	};

	const resetPassword = async (email: string) => {
		await sendPasswordResetEmail(auth, email);
	};

	const updateUserProfile = async (displayName?: string, photoURL?: string) => {
		if (currentUser) {
			await firebaseUpdateProfile(currentUser, {
				displayName: displayName || currentUser.displayName,
				photoURL: photoURL || currentUser.photoURL
			});
			setCurrentUser({ ...currentUser });
		}
	};

	const updateUserPassword = async (password: string) => {
		if (currentUser) {
			await firebaseUpdatePassword(currentUser, password);
		}
	};

	const value = {
		currentUser,
		loading,
		authReady,
		backendError,
		login,
		register,
		loginWithGoogle,
		logout,
		resetPassword,
		updateUserProfile,
		updateUserPassword
	};

	return (
		<AuthContext.Provider value={value}>
			{!loading && children}
		</AuthContext.Provider>
	);
};
