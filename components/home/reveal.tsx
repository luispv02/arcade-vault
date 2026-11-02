"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface RevealProps {
  as?: "section" | "div";
  className?: string;
  children: ReactNode;
}

/**
 * Envoltorio que revela su contenido al entrar en el viewport.
 * El contenido es visible por defecto (SSR / sin JS): solo se oculta
 * (.armed) cuando el cliente montó y no hay `prefers-reduced-motion`.
 */
export function Reveal({ as: Tag = "section", className, children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.classList.add("armed");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className ? `reveal ${className}` : "reveal"}
    >
      {children}
    </Tag>
  );
}
