import Svg, { Image as SvgImage } from 'react-native-svg';
import { View, StyleSheet, Image, Platform } from 'react-native';

type KyaneLogoProps = {
  width?: number;
  height?: number;
  style?: object;
};

// Rasio aspek asli logo: 1774 / 887 = 2:1
export function KyaneLogo({ width = 160, height = 80, style }: KyaneLogoProps) {
  // react-native-svg mendukung SVG vector wrapper, atau native Image fallback dengan rasio sempurna
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
