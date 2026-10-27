import { Platform, useWindowDimensions } from 'react-native';

export type ResponsiveLayout = {
  width: number;
  height: number;
  isWeb: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWideDesktop: boolean;
  containerMaxWidth: number;
  gridColumns: number;
};

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isWideDesktop = width >= 1360;

  let gridColumns = 2;
  if (width >= 1360) {
    gridColumns = 4;
  } else if (width >= 1024) {
    gridColumns = 3;
  } else if (width >= 768) {
    gridColumns = 3;
  }

  return {
    width,
    height,
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    isWideDesktop,
    containerMaxWidth: 1440,
    gridColumns,
  };
}

