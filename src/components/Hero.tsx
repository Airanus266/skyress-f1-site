"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const carParallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Elegant fade in for the whole hero on load
    gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1.5 });

    // Parallax logic for 3D depth when scrolling
    if (carParallaxRef.current) {
      gsap.to(carParallaxRef.current, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
        },
        y: 150, // Car lags behind vertically pushing depth
        scale: 1.05,
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <section className={styles.heroSection} ref={containerRef}>
      
      {/* Absolute Pitch Black Core - No boxes or hard lines */}
      <div className={styles.lightingCore}></div>

      {/* TOP RED SPONSOR / SYSTEM BAR */}
      <div className={styles.topNavRed}>
        <div className={styles.topNavLogo}>SKYRESS</div>
        <div className={styles.topNavLinks}>
          <span>Authentics</span>
          <span>Store</span>
          <span>Tickets</span>
          <span>Experiences</span>
          <span>SKY TV</span>
        </div>
      </div>

      {/* SECONDARY LEAGUE BAR */}
      <div className={styles.secondaryNav}>
        <div className={styles.seriesLogos}>
          <span className={styles.s1}>S1</span> <span className={styles.s2}>S2</span> <span className={styles.s3}>S3</span>
        </div>
        <div className={styles.mainNavLinks}>
          <span>Latest</span>
          <span>Video</span>
          <span>Drivers</span>
          <span>About us</span>
          <span>Standing</span>
        </div>
      </div>

      <div className={styles.heroContent}>
        
        {/* LEFT COMPOSITION */}
        <div className={styles.heroLeft}>
          <div className={styles.latestTag}>LATEST NEWS</div>
          
          <div className={styles.headline}>
            <span className={styles.headlineTop}>DESIGN TO</span>
            <span className={styles.headlineBottom}>Dominate</span>
          </div>

          <div className={styles.subhead}>
            Ready for the new <span>STEM</span> season 2026
          </div>

          <div className={styles.actionButtons}>
            <button className={styles.btnRed} onClick={() => document.getElementById('team')?.scrollIntoView({ behavior: 'smooth' })}>About us</button>
            <button className={styles.btnOutline} onClick={() => document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' })}>
              <span>SKYRESS</span> LIVE
            </button>
          </div>

          <div className={styles.infoBox}>
            <div className={styles.infoTitle}>STEM RACING F1:<br/>COMPETITION DETAILS</div>
            <div className={styles.infoText}>
              The apex of student engineering.<br/>
              Features student-designed Formula 1 models,<br/>
              pushing the limits of scale-aerodynamics.<br/>
              Live-streamed across all partnered schools and platforms.
            </div>
          </div>
        </div>

        {/* CENTER BOLID Graphic */}
        <div className={styles.heroCenter}>
          <div className={styles.carWrapper} ref={carParallaxRef}>
             <div className={styles.carFloat}>
               <Image 
                 src="/images/bolid-final.png" 
                 alt="Skyress Racing Bolid" 
                 fill
                 priority
                 className={styles.carImage}
               />
               {/* Deep localized shadow that floats WITH the car */}
               <div className={styles.carGroundShadow}></div>
             </div>
          </div>
        </div>

        {/* RIGHT COMPOSITION */}
        <div className={styles.heroRight}>
          <div className={styles.sponsorCluster}>
             <div className={styles.teamLogoText}>
               STEM RACING
               <span>F1</span>
             </div>
          </div>

          <div className={styles.driverCardPrimary}>
             <div className={styles.driverNumberBg}>1</div>
             <div className={styles.driverInfo}>
                <div className={styles.driverName}>Skyress</div>
                <div className={styles.driverPoints}>Points 421</div>
             </div>
             <div className={styles.driverIcon}>
                <Star size={14} strokeWidth={3} />
             </div>
          </div>

          <div className={styles.driverCardSecondary}>
             <div className={styles.driverInfo}>
                <div className={styles.driverName}>other Teams</div>
                <div className={styles.driverPoints}>Points 352</div>
             </div>
             <div className={styles.driverIcon} style={{width: '18px', height: '18px', background: 'transparent', border: '2px solid #fff'}}></div>
          </div>
        </div>

      </div>
    </section>
  );
}
