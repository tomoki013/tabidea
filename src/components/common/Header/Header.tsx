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
} from "react-icons/fa";
import { throttle } from "@/lib/utils";
import { usePlanModal } from "@/context/PlanModalContext";
import { useAuth } from "@/context/AuthContext";
import { AuthButton } from "../AuthButton";
import MobileSidebar from "./MobileSidebar";
import { getUserPlansList } from "@/app/actions/travel-planner";
import type { PlanListItem } from "@/types";

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
  const { openModal } = usePlanModal();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isHome = pathname === "/";

  // Server plans for sidebar
  const [serverPlans, setServerPlans] = useState<PlanListItem[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  // Scroll-based visibility for homepage
  const [scrollPastThreshold, setScrollPastThreshold] = useState(false);

  // Fetch user plans when authenticated
  const fetchUserPlans = useCallback(async () => {
    if (!isAuthenticated) {
      setServerPlans([]);
      return;
    }

    setIsLoadingPlans(true);
    try {
      const result = await getUserPlansList(5);
      if (result.success && result.plans) {
        setServerPlans(
          result.plans.map((p) => ({
            id: p.id,
            shareCode: p.shareCode,
            destination: p.destination,
            durationDays: null,
            thumbnailUrl: p.thumbnailUrl,
            isPublic: false,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch user plans:", error);
    } finally {
      setIsLoadingPlans(false);
    }
  }, [isAuthenticated]);

  // Fetch plans when auth state changes
  useEffect(() => {
    if (!isAuthLoading) {
      fetchUserPlans();
    }
  }, [isAuthLoading, fetchUserPlans]);

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
      // Show header when scrolled past ~1100px (approximately after AboutSection)
      const threshold = 1100;
      setScrollPastThreshold(window.scrollY > threshold);
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
  const commonClasses = `${positionClass} top-0 left-0 right-0 flex justify-center z-50 transition-all duration-500 ease-in-out py-4`;
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
          <div className="relative bg-[#fcfbf9]/95 backdrop-blur-md shadow-lg rounded-full border border-orange-100/50 px-4 md:px-6 py-3 flex items-center justify-between">
            {/* Hamburger menu - always visible for sidebar access */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-[#e67e22] hover:opacity-80 transition-opacity"
              aria-label="メニューを開く"
            >
              <FaBars size={20} />
            </button>

            {/* Logo */}
            <Link href="/" className="group flex items-center gap-1">
              <span className="font-serif text-2xl font-bold text-[#e67e22] tracking-tight group-hover:opacity-80 transition-opacity flex items-center">
                <span>Tabide</span>
                <span className="text-[#27ae60] font-extrabold flex items-center ml-px">
                  .a
                  <FaMapMarkerAlt className="text-[0.85em] mt-0.5" />
                </span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <NavLink href="/usage" label="使い方" icon={<FaMap />} />
              <NavLink href="/faq" label="FAQ" icon={<FaQuestionCircle />} />

              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 bg-[#e67e22] text-white px-6 py-2 rounded-full font-serif font-bold text-sm shadow-md hover:bg-[#d35400] hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                <FaPen className="text-xs" />
                <span>旅を計画する</span>
              </button>

              <AuthButton />
            </nav>

            {/* Mobile: User icon on right */}
            <div className="md:hidden">
              {isAuthLoading ? (
                <div className="w-8 h-8 rounded-full bg-[#e67e22]/20 animate-pulse" />
              ) : isAuthenticated ? (
                <Link
                  href="/my-plans"
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#e67e22]/10 transition-all"
                >
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.displayName || "ユーザー"}
                      width={32}
                      height={32}
                      className="rounded-full ring-2 ring-[#e67e22]/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#e67e22]/10 ring-2 ring-[#e67e22]/20 flex items-center justify-center">
                      <span className="text-[#e67e22] text-sm font-bold">
                        {user?.displayName?.[0] || user?.email?.[0] || "U"}
                      </span>
                    </div>
                  )}
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="flex items-center justify-center w-8 h-8 rounded-full text-[#e67e22] hover:bg-[#e67e22]/10 transition-all"
                >
                  <FaUser size={16} />
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
        serverPlans={serverPlans}
        isLoadingPlans={isLoadingPlans}
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
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-1.5 font-medium text-sm text-[#e67e22] hover:text-[#d35400] transition-colors"
    >
      <span className="text-[#e67e22]/70 group-hover:text-[#d35400] transition-colors">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
