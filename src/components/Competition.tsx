"use client";

import { useEffect, useRef } from "react";
import styles from "./Competition.module.css";
import gsap from "gsap";

export default function Competition() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".comp-element",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="competition" className={`section ${styles.competitionSection}`} ref={sectionRef}>
      <div className="container">
        <div className={styles.splitLayout}>
          
          <div className={styles.textContent}>
            <div className={`comp-element ${styles.badge}`}>THE CHALLENGE</div>
            <h2 className={`comp-element ${styles.title}`}>
              MORE THAN <br/> JUST A <span className={styles.textRed}>RACE</span>
            </h2>
            <p className={`comp-element ${styles.description}`}>
              STEM Racing is an elite multi-disciplinary challenge reaching millions of students globally. We don't just drive; we design, build, and test a miniature Formula 1 car of the future, driven by advanced aerodynamics and raw passion.
            </p>
            <div className={`comp-element ${styles.decorativeLine}`}></div>
          </div>

          <div className={styles.cardsContent} ref={cardsRef}>
            
            <div className={`comp-element ${styles.infoCard}`}>
               <h3 className={styles.cardBoxTitle}>ENGINEERING</h3>
               <p className={styles.cardBoxText}>
                 Utilizing CAD and computational fluid dynamics to minimize drag.
               </p>
               <div className={styles.boxArrow}>→</div>
            </div>

            <div className={`comp-element ${styles.infoCard}`}>
               <h3 className={styles.cardBoxTitle}>MANUFACTURING</h3>
               <p className={styles.cardBoxText}>
                 Precision 3D printing and CNC machining of the final chassis.
               </p>
               <div className={styles.boxArrow}>→</div>
            </div>

            <div className={`comp-element ${styles.infoCard} ${styles.highlightCard}`}>
               <h3 className={styles.cardBoxTitle}>ENTERPRISE</h3>
               <p className={styles.cardBoxText}>
                 Securing sponsorships, brand identity, and financial strategy.
               </p>
               <div className={styles.boxArrow}>→</div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
