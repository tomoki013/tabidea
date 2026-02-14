"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  FaBars,
  FaMap,
  FaQuestionCircle,
  FaPen,
  FaMapMarkerAlt,
  FaUser,
  FaCrown,
} from "react-icons/fa";
import { throttle } from "@/lib/utils";
import { usePlanModal } from "@/context/PlanModalContext";
import { useAuth } from "@/context/AuthContext";
import { AuthButton } from "../AuthButton";
import MobileSidebar from "./MobileSidebar";
import SettingsModal from "../SettingsModal";
import { JournalButton, Stamp, Tape, HandwrittenText } from "@/components/ui/journal";

export interface HeaderProps {
  forceShow?: boolean;
  className?: string;
  isSticky?: boolean;
}

export default function Header({
  forceShow = false,
  className = "",
  isSticky = false,
}: HeaderProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const { openModal } = usePlanModal();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isHome = pathname === "/";

  // Scroll-based visibility for homepage
  const [scrollPastThreshold, setScrollPastThreshold] = useState(false);

  // Close sidebar when path changes
  useEffect(() => {
    const timer = setTimeout(() => setIsSidebarOpen(false), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Scroll listener for homepage - show header after scrolling past threshold
  useEffect(() => {
    if (!isHome || !forceShow) {
      return;
    }

    const handleScroll = () => {
      // Show header when the input form reaches the top 1/3 of the screen
      const element = document.getElementById("planner-input-section");

      if (element) {
        const rect = element.getBoundingClientRect();
        setScrollPastThreshold(rect.bottom < window.innerHeight / 3);
      } else {
        // Fallback if element not found
        const threshold = 1100;
        setScrollPastThreshold(window.scrollY > threshold);
      }
    };

    // Initial check
    handleScroll();

    const throttledScroll = throttle(handleScroll, 100);

    window.addEventListener("scroll", throttledScroll, { passive: true });
    return () => window.removeEventListener("scroll", throttledScroll);
  }, [isHome, forceShow]);

  // Global Header Logic: If this is the global header (forceShow=false) and we are on Home, hide it completely (return null).
  if (!forceShow && isHome) {
    return null;
  }

  // For homepage with forceShow: use fixed positioning, show/hide based on scroll
  // For other pages: always visible with sticky/fixed positioning
  const isVisible = isHome ? scrollPastThreshold : true;

  // Determine container classes based on page type
  const positionClass = isHome ? "fixed" : isSticky ? "sticky" : "fixed";
  const commonClasses = `${positionClass} top-0 left-0 right-0 flex justify-center z-50 transition-all duration-500 ease-in-out py-4 pointer-events-none`;
  const visibilityClasses = isHome
    ? isVisible
      ? "opacity-100 translate-y-0"
      : "opacity-0 -translate-y-full pointer-events-none"
    : ""; // Other pages always visible

  const containerClasses = `${commonClasses} ${visibilityClasses}`;

  return (
    <>
      <header
        className={`${containerClasses} ${className}`}
        style={{ zIndex: 50 }}
      >
        <div className={`max-w-5xl w-full px-4 pointer-events-auto`}>
          {/* Paper Strip Header */}
          <div className="relative bg-[#fcfbf9] shadow-md border border-stone-200/60 px-4 md:px-8 py-2 md:py-3 flex items-center justify-between mx-auto max-w-4xl transform -rotate-1 rounded-sm">
             {/* Tape Effect */}
            <Tape color="white" position="top-center" className="opacity-80" />

            {/* Hamburger menu - always visible for sidebar access */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-sm transition-all border border-transparent hover:border-stone-300 hover:border-dashed mr-2"
              aria-label="メニューを開く"
            >
              <FaBars size={20} />
            </button>

            {/* Logo */}
            <Link href="/" className="group flex items-center gap-2 relative z-10">
              <Stamp color="black" size="sm" className="w-10 h-10 md:w-12 md:h-12 border-2 text-[0.6rem] md:text-xs rotate-[-12deg] group-hover:rotate-0 transition-transform duration-300 bg-white">
                <div className="flex flex-col items-center leading-none">
                  <span>TABI</span>
                  <span>DEA</span>
                </div>
              </Stamp>
              <div className="hidden sm:block">
                <HandwrittenText tag="span" className="text-xl md:text-2xl font-bold text-stone-800 tracking-tight group-hover:opacity-80 transition-opacity">
                  Tabidea
                </HandwrittenText>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <NavLink href="/usage" label="使い方" />
              <NavLink href="/pricing" label="料金" />
              <NavLink href="/faq" label="FAQ" />

              <JournalButton
                variant="primary"
                size="sm"
                onClick={() => openModal()}
                className="font-bold shadow-sm"
              >
                <FaPen className="mr-2 text-xs" />
                旅を計画する
              </JournalButton>

              <AuthButton />
            </nav>

            {/* Mobile: User icon on right */}
            <div className="md:hidden">
              {isAuthLoading ? (
                <div className="w-8 h-8 rounded-full bg-stone-200 animate-pulse" />
              ) : isAuthenticated ? (
                <button
                  onClick={() => setIsMobileSettingsOpen(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-full relative"
                >
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.displayName || "ユーザー"}
                      width={32}
                      height={32}
                      className="rounded-full ring-2 ring-white shadow-sm"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-300 border-dashed flex items-center justify-center">
                      <span className="text-stone-600 font-hand font-bold">
                        {user?.displayName?.[0] || user?.email?.[0] || "U"}
                      </span>
                    </div>
                  )}
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  className="flex items-center justify-center w-8 h-8 rounded-sm border border-stone-300 border-dashed text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-all font-hand"
                >
                  <FaUser size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSettings={() => {
          setIsSidebarOpen(false);
          setIsMobileSettingsOpen(true);
        }}
      />

      <SettingsModal
        isOpen={isMobileSettingsOpen}
        onClose={() => setIsMobileSettingsOpen(false)}
      />
    </>
  );
}

function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-1.5 font-hand font-bold text-stone-600 hover:text-stone-900 transition-colors relative"
    >
      {icon && (
        <span className="text-stone-400 group-hover:text-primary transition-colors">
          {icon}
        </span>
      )}
      <span>{label}</span>
      {/* Underline effect */}
      <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-primary/40 group-hover:w-full transition-all duration-300 rounded-full" />
    </Link>
  );
}
