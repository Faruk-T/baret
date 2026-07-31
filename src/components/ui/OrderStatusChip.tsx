import { Text, View } from 'react-native';

import { ORDER_STATUS_LABELS } from '../../constants/enums';
import type { OrderStatus } from '../../types/database';
import { ui } from '../../theme/ui';

const STATUS_STYLE: Record<
  OrderStatus,
  { bg: string; text: string }
> = {
  pending: { bg: ui.brandSoft, text: ui.brandDark },
  preparing: { bg: ui.warningSoft, text: ui.warning },
  shipped: { bg: ui.infoSoft, text: ui.info },
  delivered: { bg: ui.successSoft, text: ui.success },
  cancelled: { bg: ui.dangerSoft, text: ui.danger },
};

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <View
      className="self-start rounded-full px-2.5 py-1"
      style={{ backgroundColor: style.bg }}
    >
      <Text className="text-[11px] font-bold" style={{ color: style.text }}>
        {ORDER_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}
