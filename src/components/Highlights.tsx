"use client";

import { useEffect, useRef } from "react";
import styles from "./Highlights.module.css";
import gsap from "gsap";

const STATS = [
  { label: "TOP SPEED", value: "85", unit: "km/h" },
  { label: "WEIGHT", value: "50", unit: "g" },
  { label: "0-20M ACCEL", value: "1.05", unit: "s" },
  { label: "DOWNFORCE", value: "+4.8", unit: "G" },
];

export default function Highlights() {
  const containerRef = useRef<HTMLElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Mission Card
      gsap.fromTo(
        ".mission-reveal",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.2,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 75%",
          }
        }
      );

      // Data Counters Scrub
      gsap.fromTo(
        dataRef.current?.children || [],
        { opacity: 0, scale: 0.9, y: 30 },
        { 
          opacity: 1, scale: 1, y: 0, 
          duration: 0.8, stagger: 0.1, 
          ease: "back.out(1.5)",
          scrollTrigger: {
            trigger: dataRef.current,
            start: "top 80%"
          }
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className={`section ${styles.highlightsSection}`} ref={containerRef}>
      <div className={`container ${styles.container}`}>
        
        <div className={styles.missionCard}>
          <div className={styles.techBorderTop}></div>
          <div className={styles.techBorderBottom}></div>
          
          <div className={`mission-reveal micro-data ${styles.brandTag}`}>TEAM MISSION</div>
          <h2 className={`mission-reveal ${styles.missionTitle}`}>
            ENGINEERED <br/>
            FOR <span className={styles.textRed}>EXTREMES</span>
          </h2>
          <p className={`mission-reveal ${styles.missionText}`}>
            Skyress is entering the 2026 season with a relentless pursuit of perfection. By uniting cutting-edge engineering with bold enterprise strategies, we don't just participate—we redefine the standards of STEM Racing. Every gram removed, every aerodynamic curve polished, serves one purpose: Speed.
          </p>
          
          <div className={`mission-reveal ${styles.signatureBlock}`}>
            <span className={styles.signatureText}>SKYRESS / 2026 CHASSIS</span>
          </div>
        </div>

        <div className={styles.statsGrid} ref={dataRef}>
          {STATS.map((stat, i) => (
            <div key={i} className={styles.statBlock}>
              <div className={styles.crosshairTopLeft}></div>
              <div className={styles.crosshairBottomRight}></div>
              
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={styles.statValue}>
                {stat.value}
                <span className={styles.statUnit}>{stat.unit}</span>
              </div>
              <div className={styles.statBar}></div>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
