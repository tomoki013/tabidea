"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBars,
  FaTimes,
  FaMap,
  FaQuestionCircle,
  FaPen,
  FaMapMarkerAlt,
} from "react-icons/fa";
import PlanModal from "@/components/ui/PlanModal";
import { throttle } from "@/lib/utils";

interface HeaderProps {
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
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isHome = pathname === "/";

  // Scroll-based visibility for homepage
  const [scrollPastThreshold, setScrollPastThreshold] = useState(false);

  // Close mobile menu when path changes
  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(false), 0);
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
          <div className="relative bg-[#fcfbf9]/95 backdrop-blur-md shadow-lg rounded-full border border-orange-100/50 px-6 py-3 flex items-center justify-between">
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
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-[#e67e22] text-white px-6 py-2 rounded-full font-serif font-bold text-sm shadow-md hover:bg-[#d35400] hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                <FaPen className="text-xs" />
                <span>旅を計画する</span>
              </button>
            </nav>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-[#e67e22] hover:opacity-80 transition-opacity"
              aria-label="Toggle menu"
            >
              {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Overlay Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-24 z-[60] bg-[#fcfbf9] rounded-2xl shadow-xl border border-orange-100 p-6 flex flex-col items-center gap-6 md:hidden"
          >
            <MobileMenuItem
              href="/"
              label="ホーム"
              onClick={() => setIsOpen(false)}
            />
            <MobileMenuItem
              href="/usage"
              label="使い方"
              onClick={() => setIsOpen(false)}
            />
            <MobileMenuItem
              href="/faq"
              label="よくある質問"
              onClick={() => setIsOpen(false)}
            />

            <button
              onClick={() => {
                setIsOpen(false);
                setIsModalOpen(true);
              }}
              className="w-full bg-[#e67e22] text-white py-3 rounded-xl font-serif font-bold text-lg shadow-md"
            >
              プランを作成する
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan Modal */}
      <PlanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
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

function MobileMenuItem({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-lg font-bold text-stone-800 hover:text-[#e67e22] transition-colors"
    >
      {label}
    </Link>
  );
}
