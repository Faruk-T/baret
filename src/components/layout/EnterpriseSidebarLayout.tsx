import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export type SidebarMenuItem = {
  key: string;
  label: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  badgeCount?: number;
  onPress: () => void;
};

type EnterpriseSidebarLayoutProps = {
  brandTitle: string;
  brandSubtitle: string;
  roleBadge: string;
  activeKey: string;
  items: SidebarMenuItem[];
  headerRight?: ReactNode;
  footerNode?: ReactNode;
  children: ReactNode;
};

/**
 * On Desktop Web (>= 1024px), wraps Seller ERP or Admin Control Tower screens
 * in a clean architectural dark sidebar (#18181B) + main workspace.
 * On Mobile/Tablet, renders children directly so native navigation remains untouched.
 */
export function EnterpriseSidebarLayout({
  brandTitle,
  brandSubtitle,
  roleBadge,
  activeKey,
  items,
  headerRight,
  footerNode,
  children,
}: EnterpriseSidebarLayoutProps) {
  const { isDesktop } = useResponsiveLayout();

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <View className="flex-1 flex-row bg-zinc-50">
      {/* Left Architectural Dark Sidebar */}
      <View
        style={{ width: 272, backgroundColor: '#18181B' }}
        className="border-r border-zinc-800 justify-between py-6 px-4"
      >
        <View className="flex-1">
          {/* Brand Header */}
          <View className="flex-row items-center px-2 pb-6 border-b border-zinc-800">
            <View className="w-9 h-9 rounded-lg bg-white items-center justify-center mr-3">
              <View className="w-3.5 h-3.5 rounded-sm bg-amber-600" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-white text-base font-black tracking-tight">
                  {brandTitle}
                </Text>
                <View className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 ml-2">
                  <Text className="text-amber-400 text-[10px] font-bold">
                    {roleBadge}
                  </Text>
                </View>
              </View>
              <Text className="text-zinc-400 text-xs mt-0.5" numberOfLines={1}>
                {brandSubtitle}
              </Text>
            </View>
          </View>

          {/* Navigation Items */}
          <ScrollView className="mt-5" showsVerticalScrollIndicator={false}>
            <Text className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-3 mb-2">
              Yönetim Menüsü
            </Text>
            {items.map((item) => {
              const active = item.key === activeKey;
              return (
                <Pressable
                  key={item.key}
                  onPress={item.onPress}
                  className={`flex-row items-center justify-between px-3.5 py-2.5 rounded-lg mb-1 ${
                    active ? 'bg-zinc-800 border border-zinc-700' : 'bg-transparent'
                  }`}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <Feather
                      name={item.icon}
                      size={16}
                      color={active ? '#F59E0B' : '#A1A1AA'}
                    />
                    <View className="ml-3 flex-1">
                      <Text
                        className={`text-sm font-semibold ${
                          active ? 'text-white' : 'text-zinc-300'
                        }`}
                      >
                        {item.label}
                      </Text>
                      {item.subtitle ? (
                        <Text
                          className={`text-[11px] mt-0.5 ${
                            active ? 'text-zinc-400' : 'text-zinc-500'
                          }`}
                          numberOfLines={1}
                        >
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {item.badgeCount != null && item.badgeCount > 0 ? (
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        active ? 'bg-amber-600' : 'bg-zinc-800'
                      }`}
                    >
                      <Text className="text-[11px] font-bold text-white">
                        {item.badgeCount > 99 ? '99+' : item.badgeCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {footerNode ? (
          <View className="pt-4 border-t border-zinc-800">{footerNode}</View>
        ) : null}
      </View>

      {/* Main Workspace Area */}
      <View className="flex-1 bg-zinc-50">
        {headerRight ? (
          <View className="bg-white border-b border-zinc-200 px-6 py-3 flex-row items-center justify-end">
            {headerRight}
          </View>
        ) : null}
        <View className="flex-1">{children}</View>
      </View>
    </View>
  );
}
