"use client";

import { useEffect, useRef } from "react";
import styles from "./Process.module.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const STEPS = [
  { id: "01", title: "RESEARCH", desc: "Analyzing fluid dynamics and material properties to define optimal parameters.", stat: "COMPLETED" },
  { id: "02", title: "DESIGN", desc: "Iterative CAD modeling focused on minimizing drag coefficient and weight.", stat: "0.112 Cd" },
  { id: "03", title: "PROTOTYPING", desc: "CNC machining structural bodies and 3D printing aerodynamic components.", stat: "TOLERANCE 0.01mm" },
  { id: "04", title: "TESTING", desc: "Wind tunnel iterations and digital CFD verification for peak performance.", stat: "VALIDATED" },
  { id: "05", title: "RACEDAY", desc: "Executing on the track with perfect reaction times and robust setups.", stat: "T-MINUS 12D" }
];

export default function Process() {
  const containerRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Only run if GSAP is available
    if(typeof window === "undefined" || !trackRef.current || !carRef.current) return;

    const ctx = gsap.context(() => {
      
      gsap.fromTo(".process-header", 
        {y: 40, opacity: 0},
        {y: 0, opacity: 1, duration: 1, ease: "power3.out", scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%"
        }}
      );

      gsap.fromTo(".process-step",
        { y: 60, opacity: 0, x: (i) => i % 2 === 0 ? -40 : 40 },
        { 
          y: 0, 
          opacity: 1,
          x: 0,
          duration: 1, 
          ease: "power4.out",
          scrollTrigger: {
            trigger: ".process-grid",
            start: "top 70%",
            end: "bottom 80%",
            scrub: 0.5,
          }
        }
      );

      // Line Fill and Mini Car Animation Timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trackRef.current,
          start: "top 50%",
          end: "bottom 50%",
          scrub: 1,
        }
      });

      // Advance line
      tl.fromTo(".process-line-fill", { height: "0%" }, { height: "100%", ease: "none" }, 0);
      
      // Move car along the line
      tl.fromTo(carRef.current, { top: "0%" }, { top: "100%", ease: "none" }, 0);

      // Pulse dots as car passes
      const dots = gsap.utils.toArray(".step-dot");
      dots.forEach((dot: any, i) => {
        gsap.to(dot, {
          scrollTrigger: {
             trigger: dot,
             start: "top 50%",
             toggleActions: "play none none reverse",
          },
          borderColor: "var(--color-red)",
          boxShadow: "0 0 20px var(--color-red)",
          backgroundColor: "var(--color-white)",
          duration: 0.3
        });
      });

    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="process" className={`section ${styles.processSection}`} ref={containerRef}>
      <div className="container">
        
        <div className={`process-header ${styles.header}`}>
          <div className="micro-data" style={{justifyContent: 'center', marginBottom: '15px'}}>DEVELOPMENT TIMELINE</div>
          <h2 className={styles.title}>PATH TO <span className={styles.textOutline}>THE</span> <span className={styles.textRed}>PODIUM</span></h2>
        </div>

        <div className={`process-grid ${styles.gridContainer}`}>
          
          <div className={styles.lineContainer} ref={trackRef}>
             <div className={styles.lineBase}></div>
             <div className={`process-line-fill ${styles.lineFill}`}></div>
             
             {/* THE MINI CAR */}
             <div className={styles.miniCarTracker} ref={carRef}>
                <svg viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0L24 10V30L12 40L0 30V10L12 0Z" fill="var(--color-red)"/>
                  <path d="M12 5L18 12V28L12 35L6 28V12L12 5Z" fill="var(--color-dark)"/>
                  <circle cx="12" cy="20" r="3" fill="var(--color-white)"/>
                </svg>
                <div className={styles.carGlow}></div>
             </div>
          </div>
          
          <div className={styles.stepsList}>
            {STEPS.map((step, i) => (
              <div key={step.id} className={`process-step ${styles.stepCard} ${i % 2 !== 0 ? styles.stepRight : styles.stepLeft}`}>
                <div className={`step-dot ${styles.stepDot}`}></div>
                <div className={styles.stepContent}>
                  
                  <div className={styles.stepHeader}>
                    <div className={styles.stepId}>{step.id}</div>
                    <div className={styles.stepStat}>{step.stat}</div>
                  </div>
                  
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDesc}>{step.desc}</p>
                  <div className={styles.techAccent}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
