"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
}

// Najmanji mogući klijentski list (skill, odeljak 3): samo ovo dugme treba
// da zna trenutnu putanju da bi ocrtalo aktivnu stavku, ostatak SiteHeader-a
// ostaje Server Component.
export function NavLink({ href, children, className, activeClassName }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} className={clsx(className, active && activeClassName)}>
      {children}
    </Link>
  );
}
