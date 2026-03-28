"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  Suspense,
} from "react";
import { usePathname } from "next/navigation";
import { PlanModal } from "@/components/common";
import { UserInput } from "@/types";

interface PlanModalContextType {
  isOpen: boolean;
  openModal: (options?: { initialInput?: UserInput; initialStep?: number }) => void;
  closeModal: () => void;
}

const PlanModalContext = createContext<PlanModalContextType | undefined>(undefined);

export function PlanModalProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<{
    initialInput?: UserInput;
    initialStep?: number;
  }>({});
  const [openedPathname, setOpenedPathname] = useState<string | null>(null);

  const openModal = (options?: { initialInput?: UserInput; initialStep?: number }) => {
    if (options) {
      setModalOptions(options);
    } else {
      setModalOptions({});
    }
    setOpenedPathname(pathname);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setOpenedPathname(null);
    // Optional: clear options after close animation
    setTimeout(() => setModalOptions({}), 300);
  };
  const isModalVisible = isOpen && openedPathname === pathname;

  return (
    <PlanModalContext.Provider value={{ isOpen: isModalVisible, openModal, closeModal }}>
      {children}
      <Suspense fallback={null}>
        <PlanModal
          isOpen={isModalVisible}
          onClose={closeModal}
          initialInput={modalOptions.initialInput}
          initialStep={modalOptions.initialStep}
        />
      </Suspense>
    </PlanModalContext.Provider>
  );
}

export function usePlanModal() {
  const context = useContext(PlanModalContext);
  if (context === undefined) {
    throw new Error("usePlanModal must be used within a PlanModalProvider");
  }
  return context;
}
