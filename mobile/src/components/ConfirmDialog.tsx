import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  saving,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const styles = useStyles(buildStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={styles.cancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onConfirm}
              style={[styles.confirm, destructive && styles.destructive, saving && styles.disabled]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Konfirmasi yang tampil identik di web dan native.
 * Alert.alert tidak merender dialog di Expo Web, jadi konfirmasi memakai Modal.
 */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const confirm = useCallback((next: ConfirmOptions) => {
    setError('');
    setOptions(next);
  }, []);

  const cancel = useCallback(() => {
    if (!saving) setOptions(null);
  }, [saving]);

  const accept = useCallback(async () => {
    if (!options || saving) return;
    setSaving(true);
    setError('');
    try {
      await options.onConfirm();
      setOptions(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  }, [options, saving]);

  const dialog = (
    <ConfirmDialog
      visible={Boolean(options)}
      title={options?.title ?? ''}
      message={options?.message}
      confirmLabel={options?.confirmLabel ?? 'Konfirmasi'}
      cancelLabel={options?.cancelLabel ?? 'Batal'}
      destructive={Boolean(options?.destructive)}
      saving={saving}
      error={error}
      onCancel={cancel}
      onConfirm={() => void accept()}
    />
  );

  return { confirm, dialog };
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.48)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 12 },
    title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
    message: { color: colors.muted, fontSize: 14, lineHeight: 20 },
    error: { color: colors.dangerDark, backgroundColor: colors.dangerSoft, padding: 10, borderRadius: 8, fontSize: 13 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    cancel: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 13, borderRadius: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
    cancelText: { color: colors.muted, fontWeight: '700' },
    confirm: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 13, borderRadius: 10, backgroundColor: colors.brandDeep },
    destructive: { backgroundColor: colors.dangerDark },
    confirmText: { color: '#fff', fontWeight: '700' },
    disabled: { opacity: 0.65 },
  });
}
