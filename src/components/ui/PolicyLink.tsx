import Link from 'next/link';
import { ReactNode } from 'react';

interface PolicyLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
}

export function PolicyLink({ href, children, className = "", target }: PolicyLinkProps) {
  return (
    <Link
      href={href}
      target={target}
      className={`text-[#e67e22] hover:text-[#d35400] underline decoration-dashed underline-offset-4 decoration-1 hover:decoration-solid transition-all duration-200 font-medium ${className}`}
    >
      {children}
    </Link>
  );
}
