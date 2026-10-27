import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  type AlertButton,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ui } from '../../theme/ui';

export type DialogRequest = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

type DialogContextValue = {
  showDialog: (req: DialogRequest) => void;
};

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

const nativeAlert = Alert.alert.bind(Alert);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<DialogRequest[]>([]);

  const showDialog = useCallback((req: DialogRequest) => {
    setQueue((prev) => [...prev, req]);
  }, []);

  useEffect(() => {
    // Intercept Alert.alert on Web (where multi-button callbacks do not run)
    // and on Android when > 3 buttons are passed (Android AlertDialog drops 4th+ buttons).
    Alert.alert = (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: { cancelable?: boolean; onDismiss?: () => void }
    ) => {
      if (
        Platform.OS === 'web' ||
        (Platform.OS === 'android' && buttons && buttons.length > 3)
      ) {
        showDialog({ title, message, buttons });
        return;
      }
      nativeAlert(title, message, buttons, options);
    };

    return () => {
      Alert.alert = nativeAlert;
    };
  }, [showDialog]);

  const current = queue[0] ?? null;

  const dismissCurrent = useCallback((btn?: AlertButton) => {
    setQueue((prev) => prev.slice(1));
    if (btn?.onPress) {
      setTimeout(() => {
        btn.onPress?.();
      }, 40);
    }
  }, []);

  const buttons: AlertButton[] = useMemo(() => {
    if (!current?.buttons || current.buttons.length === 0) {
      return [{ text: 'Tamam', style: 'default' }];
    }
    return current.buttons;
  }, [current]);

  const value = useMemo(() => ({ showDialog }), [showDialog]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal
        visible={Boolean(current)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          const cancelBtn = buttons.find((b) => b.style === 'cancel');
          dismissCurrent(cancelBtn);
        }}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/55 px-5"
          onPress={() => {
            const cancelBtn = buttons.find((b) => b.style === 'cancel');
            if (cancelBtn) dismissCurrent(cancelBtn);
          }}
        >
          <Pressable
            className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6"
            style={ui.shadow}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-3 flex-row items-center">
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: ui.brandSoft }}
              >
                <Ionicons
                  name="information-circle"
                  size={22}
                  color={ui.brand}
                />
              </View>
              <Text className="flex-1 text-lg font-extrabold text-stone-900">
                {current?.title}
              </Text>
            </View>

            {current?.message ? (
              <Text className="mb-6 text-sm leading-5 text-stone-600">
                {current.message}
              </Text>
            ) : null}

            <View
              className={
                buttons.length > 2
                  ? 'flex-col gap-2'
                  : 'flex-row justify-end gap-2.5'
              }
            >
              {buttons.map((btn, idx) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                return (
                  <Pressable
                    key={`${btn.text ?? 'btn'}-${idx}`}
                    onPress={() => dismissCurrent(btn)}
                    className={`items-center justify-center rounded-2xl px-4 py-3 ${
                      buttons.length <= 2 ? 'min-w-[104px]' : 'w-full'
                    } ${
                      isDestructive
                        ? 'bg-red-600'
                        : isCancel
                          ? 'border border-stone-200 bg-stone-100'
                          : 'bg-brand'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        isCancel ? 'text-stone-700' : 'text-white'
                      }`}
                    >
                      {btn.text || 'Tamam'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    return {
      showDialog: (req: DialogRequest) =>
        Alert.alert(req.title, req.message, req.buttons),
    };
  }
  return ctx;
}

