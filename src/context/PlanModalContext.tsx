"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { PlanModal } from "@/components/common";
import { UserInput } from "@/types";

interface PlanModalContextType {
  isOpen: boolean;
  openModal: (options?: { initialInput?: UserInput; initialStep?: number }) => void;
  closeModal: () => void;
}

const PlanModalContext = createContext<PlanModalContextType | undefined>(undefined);

export function PlanModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<{
    initialInput?: UserInput;
    initialStep?: number;
  }>({});

  const openModal = (options?: { initialInput?: UserInput; initialStep?: number }) => {
    if (options) {
      setModalOptions(options);
    } else {
      setModalOptions({});
    }
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    // Optional: clear options after close animation
    setTimeout(() => setModalOptions({}), 300);
  };

  return (
    <PlanModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
      <PlanModal
        isOpen={isOpen}
        onClose={closeModal}
        initialInput={modalOptions.initialInput}
        initialStep={modalOptions.initialStep}
      />
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
