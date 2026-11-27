import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';

type NoticeOptions = { title: string; message?: string; actionLabel?: string };

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  actionLabel: string;
  onClose: () => void;
};

export function NoticeDialog({ visible, title, message, actionLabel, onClose }: Props) {
  const styles = useStyles(buildStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.action}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Pesan/error yang tetap terlihat di Expo Web.
 * Alert.alert tidak merender dialog di web, jadi semua feedback memakai Modal.
 */
export function useNoticeDialog() {
  const [options, setOptions] = useState<NoticeOptions | null>(null);
  const notify = useCallback((next: NoticeOptions) => setOptions(next), []);
  const close = useCallback(() => setOptions(null), []);
  const dialog = (
    <NoticeDialog
      visible={Boolean(options)}
      title={options?.title ?? ''}
      message={options?.message}
      actionLabel={options?.actionLabel ?? 'Tutup'}
      onClose={close}
    />
  );
  return { notify, dialog };
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.48)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 12 },
    title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
    message: { color: colors.muted, fontSize: 14, lineHeight: 20 },
    action: { alignItems: 'center', justifyContent: 'center', padding: 13, borderRadius: 10, backgroundColor: colors.brandDeep },
    actionText: { color: '#fff', fontWeight: '700' },
  });
}
