"use client";

import styles from "./Footer.module.css";
import { ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    <footer id="footer" className={`section ${styles.footerSection}`}>
      <div className={styles.ctaBackground}></div>
      
      <div className={`container ${styles.container}`}>
        <div className={styles.content}>
          <h2 className={styles.title}>BE PART OF OUR <br/> <span className={styles.textRed}>RACING STORY</span></h2>
          <p className={styles.subtitle}>
            Follow our journey to the 2026 Finals. Behind the scenes, engineering breakthroughs, and race day action.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a 
              href="https://www.instagram.com/skyress_f1?igsh=MjAyaXJubHNmZmlz&utm_source=qr" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.ctaButton}
            >
              GET IN TOUCH <ArrowRight className={styles.icon} size={24} />
            </a>
            <a 
              href="/simulation" 
              className={styles.ctaButton}
            >
              SIMULATION <ArrowRight className={styles.icon} size={24} />
            </a>
          </div>
        </div>
        
        <div className={styles.bottomBar}>
          <div className={styles.logo}>SKYRESS MOTORSPORT</div>
          <div className={styles.copyright}>© 2026 Skyress STEM Racing Team. All Rights Reserved.</div>
        </div>
      </div>
    </footer>
  );
}
