"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./Navbar.module.css";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo}>
          <svg className={styles.logoIcon} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 30L20 5L35 30H25L20 20L15 30H5Z" fill="currentColor"/>
            <path d="M12 30H28L35 15H19L12 30Z" fill="var(--color-red)"/>
          </svg>
          SKYRESS
        </Link>
        
        <div className={`${styles.navLinks} ${mobileMenuOpen ? styles.mobileOpen : ""}`}>
          <Link href="#team" onClick={() => setMobileMenuOpen(false)}>About us</Link>
          <Link href="#competition" onClick={() => setMobileMenuOpen(false)}>Competition</Link>
          <Link href="#process" onClick={() => setMobileMenuOpen(false)}>Process</Link>
          <Link href="#gallery" onClick={() => setMobileMenuOpen(false)}>Gallery</Link>
          <a href="https://www.instagram.com/skyress_f1?igsh=MjAyaXJubHNmZmlz&utm_source=qr" target="_blank" rel="noopener noreferrer" className={styles.navBtn}>Connect</a>
        </div>

        <button className={styles.mobileToggle} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={28}/> : <Menu size={28}/>}
        </button>
      </div>
    </nav>
  );
}
