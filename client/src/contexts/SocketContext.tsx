import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { getSocket } from '../services/socket';
import { useNotification } from './NotificationContext';
import { soundService } from '../services/sound';

export interface VpbankTransactionEvent {
  keyShare: string;
  type?: string;
  newTransactions?: any[];
  rawPayload?: any;
}

type TransactionEventHandler = (event: VpbankTransactionEvent) => void;

interface SocketContextValue {
  subscribe: (handler: TransactionEventHandler) => () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handlersRef = useRef<Set<TransactionEventHandler>>(new Set());
  const { success } = useNotification();

  const contextValue = useMemo<SocketContextValue>(
    () => ({
      subscribe: (handler: TransactionEventHandler) => {
        handlersRef.current.add(handler);
        return () => {
          handlersRef.current.delete(handler);
        };
      },
    }),
    [],
  );

  useEffect(() => {
    const socket = getSocket();

    const onEvent = (data: any) => {
      const event: VpbankTransactionEvent = {
        keyShare: data?.keyShare,
        type: data?.type,
        newTransactions: data?.payload?.newTransactions,
        rawPayload: data,
      };

      if (event.type === 'fcm_notification') {
        try {
          const fcm = event.rawPayload?.payload ?? event.rawPayload;
          const fcmData = fcm?.data || fcm || {};
          const rawAudioUrl: string | undefined = fcmData['amount-tts-api'];
          const audioStatus: string | undefined = fcmData['amount-tts-status'];
          const audioJwt: string | undefined = fcmData['amount-tts-jwt'];

          console.log('[SocketProvider] FCM notification received:', {
            keyShare: event.keyShare,
            hasAudioUrl: !!rawAudioUrl,
            audioStatus,
            audioEnabled: isAudioEnabledForAccount(event.keyShare),
          });

          if (
            rawAudioUrl &&
            audioStatus === 'true' &&
            isAudioEnabledForAccount(event.keyShare)
          ) {
            const base = `/api/bank/vpbank/audio?url=${encodeURIComponent(
              rawAudioUrl,
            )}`;
            const proxiedUrl = audioJwt
              ? `${base}&token=${encodeURIComponent(audioJwt)}`
              : base;

            console.log('[SocketProvider] Playing audio:', proxiedUrl.substring(0, 100) + '...');

            // Use sound service to play
            void soundService.playNotificationSound(proxiedUrl).catch(e => {
              console.warn('[SocketProvider] Audio play blocked (FCM):', e);
            });
          } else {
            console.log('[SocketProvider] Audio not played:', {
              hasUrl: !!rawAudioUrl,
              status: audioStatus,
              enabled: isAudioEnabledForAccount(event.keyShare),
            });
          }
        } catch (e) {
          console.warn('[SocketProvider] Failed to handle FCM audio event:', e);
        }

        handlersRef.current.forEach((handler) => {
          try {
            handler(event);
          } catch (e) {
            console.error('[SocketProvider] Handler error:', e);
          }
        });
        return;
      }

      const tx = event.newTransactions && event.newTransactions[0];
      if (tx) {
        const amount = tx.amount ?? '';
        const currency = tx.currency ?? '';
        const account = tx.accountNumber ?? event.keyShare ?? '';
        const note: string = tx.note ?? '';
        const shortNote =
          note.length > 80 ? `${note.slice(0, 77)}...` : note;

        const msg = `Giao dịch mới: +${amount} ${currency} vào TK ${account}${shortNote ? ` — ${shortNote}` : ''
          }`;
        success(msg);
      } else {
        success('Có giao dịch mới từ VPBank');
      }

      handlersRef.current.forEach((handler) => {
        try {
          handler(event);
        } catch (e) {
          console.error('[SocketProvider] Handler error:', e);
        }
      });
    };

    socket.on('vpbank:transaction', onEvent);

    return () => {
      socket.off('vpbank:transaction', onEvent);
    };
  }, [success]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};


const AUDIO_PREFIX = 'vpbank_audio_enabled_';

export function isAudioEnabledForAccount(keyShare?: string): boolean {
  if (!keyShare || typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(AUDIO_PREFIX + keyShare);
    if (raw === null) return true; // mặc định bật
    return raw === '1';
  } catch {
    return true;
  }
}

export function setAudioEnabledForAccount(keyShare: string, enabled: boolean): void {
  if (!keyShare || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUDIO_PREFIX + keyShare, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

export function useTransactionEvents(
  scopeKeyShare: string | undefined,
  handler: (event: VpbankTransactionEvent) => void,
): void {
  const ctx = useContext(SocketContext);

  useEffect(() => {
    if (!ctx) {
      console.warn('useTransactionEvents must be used within a SocketProvider');
      return;
    }

    const unsubscribe = ctx.subscribe((event) => {
      if (
        !scopeKeyShare ||
        scopeKeyShare === 'all' ||
        event.keyShare === scopeKeyShare
      ) {
        handler(event);
      }
    });

    return unsubscribe;
  }, [ctx, scopeKeyShare, handler]);
}

