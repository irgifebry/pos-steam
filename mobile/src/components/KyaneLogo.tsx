import { Image, View } from 'react-native';
import Svg, { Image as SvgImage } from 'react-native-svg';

type KyaneLogoProps = {
  width?: number;
  height?: number;
  style?: object;
  /** default: PNG asli · transparent: warna asli tanpa latar putih · mono: putih untuk dark mode */
  variant?: 'default' | 'transparent' | 'mono';
  /** @deprecated pakai variant="mono" */
  mono?: boolean;
};

// Rasio aspek asli logo: 1774 / 887 = 2:1
export function KyaneLogo({
  width = 160,
  height = 80,
  style,
  variant,
  mono = false,
}: KyaneLogoProps) {
  const resolved = variant ?? (mono ? 'mono' : 'transparent');
  if (resolved !== 'default') {
    return (
      <Image
        accessible={false}
        resizeMode="contain"
        source={
          resolved === 'mono'
            ? require('../../assets/kyane-logo-mono.png')
            : require('../../assets/kyane-logo-transparent.png')
        }
        style={[{ width, height }, style]}
      />
    );
  }

  return (
    <View style={[{ width, height, justifyContent: 'center', alignItems: 'center' }, style]}>
      <Svg width={width} height={height} viewBox="0 0 1774 887">
        <SvgImage
          href={require('../../assets/kyane-logo.png')}
          x="0"
          y="0"
          width="1774"
          height="887"
          preserveAspectRatio="xMidYMid meet"
        />
      </Svg>
    </View>
  );
}
