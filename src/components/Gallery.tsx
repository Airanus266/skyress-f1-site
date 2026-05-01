"use client";

import { useEffect, useRef } from "react";
import styles from "./Gallery.module.css";
import Image from "next/image";
import gsap from "gsap";

const IMAGES = [
  { src: "/images/Skyress car Render.jpg", alt: "Aerodynamic Simulation", span: "wide" },
  { src: "/images/testingday.jpeg", alt: "Track Testing Ops", span: "square" },
  { src: "/images/kino.jpeg", alt: "Pre-Race Diagnostics", span: "square" },
];

export default function Gallery() {
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".gallery-item",
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.2,
          stagger: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: galleryRef.current,
            start: "top 70%",
          }
        }
      );
    }, galleryRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="gallery" className={`section ${styles.gallerySection}`}>
      <div className="container">
        
        <div className={styles.sectionHeader}>
           <div className="micro-data">ARCHIVE</div>
           <h2 className={styles.sectionTitle}>VISUAL <span className={styles.textRed}>TELEMETRY</span></h2>
        </div>
        
        <div className={styles.grid} ref={galleryRef}>
          {IMAGES.map((img, i) => (
            <div key={i} className={`gallery-item ${styles.imageWrapper} ${img.span === 'wide' ? styles.wide : ''}`}>
              <Image 
                src={img.src}
                alt={img.alt}
                fill
                className={styles.image}
                sizes={img.span === 'wide' ? '100vw' : '50vw'}
                // Use multiply for the car render to blend its white BG to dark
                style={img.src.includes('Render') ? { mixBlendMode: 'multiply' } : {}}
              />
              {/* Optional overlay that adds a tech frame */}
              <div className={styles.techFrame}></div>

              <div className={styles.overlay}>
                <div className={styles.captionHeader}>
                   <span className={styles.captionID}>IMG-{2026 + i}</span>
                   <span className={styles.captionAlt}>{img.alt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
