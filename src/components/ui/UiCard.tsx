import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { ui } from '../../theme/ui';

type Props = ViewProps & {
  children: ReactNode;
  padded?: boolean;
  className?: string;
};

export function UiCard({ children, padded = true, className, style, ...rest }: Props) {
  return (
    <View
      className={`overflow-hidden rounded-2xl border border-stone-200 bg-white ${
        padded ? 'p-4' : ''
      } ${className ?? ''}`}
      style={[ui.shadow, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
