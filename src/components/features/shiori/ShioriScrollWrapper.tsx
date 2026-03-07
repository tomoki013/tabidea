'use client';

import Header from '@/components/common/Header/Header';

export default function ShioriScrollWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header forceShow={true} />
      {children}
    </>
  );
}
