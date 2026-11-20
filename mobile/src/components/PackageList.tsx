import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Addon, ServicePackage, VehicleType } from '../types';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';

export const formatIDR = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(amount)}`;

type Props = {
  vehicleType: VehicleType;
  packages: ServicePackage[];
  addons: Addon[];
  packageId: string;
  addonIds: string[];
  onPackageChange: (id: string) => void;
  onAddonToggle: (id: string) => void;
};

export function PackageList({
  vehicleType,
  packages,
  addons,
  packageId,
  addonIds,
  onPackageChange,
  onAddonToggle,
}: Props) {
  const styles = useStyles(buildStyles);
  const visiblePackages = packages.filter((item) => item.active && item.vehicleType === vehicleType);
  const visibleAddons = addons.filter((item) => item.active && item.vehicleTypes.includes(vehicleType));

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Paket cuci</Text>
      {visiblePackages.length ? (
        visiblePackages.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: packageId === item.id }}
            onPress={() => onPackageChange(item.id)}
            style={[styles.item, packageId === item.id && styles.chosen]}
          >
            <View style={styles.copy}>
              <Text style={styles.name}>{item.name}</Text>
              {!!item.description && <Text style={styles.detail}>{item.description}</Text>}
            </View>
            <Text style={styles.price}>{formatIDR(item.price)}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.empty}>Paket belum tersedia untuk kendaraan ini.</Text>
      )}

      <Text style={[styles.heading, styles.addonHeading]}>
        Add-on <Text style={styles.optional}>(opsional)</Text>
      </Text>
      {visibleAddons.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: addonIds.includes(item.id) }}
          onPress={() => onAddonToggle(item.id)}
          style={[styles.item, addonIds.includes(item.id) && styles.chosen]}
        >
          <Text style={styles.name}>
            {addonIds.includes(item.id) ? '☑ ' : '□ '}
            {item.name}
          </Text>
          <Text style={styles.price}>
            {formatIDR(item.price)}
            {item.unitLabel ? ` / ${item.unitLabel}` : ''}
          </Text>
        </Pressable>
      ))}
      {!visibleAddons.length && <Text style={styles.empty}>Tidak ada add-on tersedia.</Text>}
    </View>
  );
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
  container: { gap: 10 },
  heading: { fontSize: 15, fontWeight: '800', color: colors.ink },
  addonHeading: { marginTop: 8 },
  optional: { fontWeight: '400', color: colors.muted, fontSize: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  chosen: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  copy: { flex: 1, gap: 3 },
  name: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  detail: { color: colors.muted, fontSize: 12 },
  price: { color: colors.brandDark, fontSize: 13, fontWeight: '800' },
  empty: { color: colors.muted, fontSize: 13, paddingVertical: 8 },
  });
}
