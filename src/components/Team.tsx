"use client";

import { useEffect, useRef } from "react";
import styles from "./Team.module.css";
import Image from "next/image";
import gsap from "gsap";

const TEAM_MEMBERS = [
  { name: "Yekiya Islam", role: "manufacturing", image: "/images/teammember 1.JPG", number: "01" },
  { name: "Omarkul Yerkebulan", role: "Captain", image: "/images/teammember2.JPG", number: "02" },
  { name: "Tabylgan Eren", role: "engineering", image: "/images/teammember3.JPG", number: "03" },
  { name: "Namiyash Aibol", role: "Enterprise", image: "/images/teammember4.JPG", number: "04" },
  { name: "Nyssanaly Aslan", role: "Digital", image: "/images/teammember5.png", number: "05" },
  { name: "Nazarbayev Nurtas", role: "engineering", image: "/images/teammember6.jpeg", number: "06" }
];

export default function Team() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        ".team-header",
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power4.out", scrollTrigger: { trigger: sectionRef.current, start: "top 75%" } }
      );

      // Cards stagger animation
      if (cardsRef.current) {
        gsap.fromTo(
          cardsRef.current.children,
          { y: 120, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.9,
            stagger: 0.1,
            ease: "back.out(1.2)",
            scrollTrigger: {
              trigger: cardsRef.current,
              start: "top 80%",
            }
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="team" className={`section ${styles.teamSection}`} ref={sectionRef}>
      <div className={`container ${styles.container}`}>
        
        <div className={`team-header ${styles.sectionHeader}`}>
          <div className="micro-data">OFFICIAL ROSTER</div>
          <h2 className={styles.sectionTitle}>
             THE <span className={styles.textOutline}>RACING</span> <span className={styles.textRed}>ELITE</span>
          </h2>
        </div>

        <div className={styles.grid} ref={cardsRef}>
          {TEAM_MEMBERS.map((member, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.cardNumber}>{member.number}</div>
              <div className={styles.cardImageWrapper}>
                <Image 
                  src={member.image} 
                  alt={member.name}
                  fill
                  className={styles.cardImage}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className={styles.cardGradientTop}></div>
                <div className={styles.cardGradientBottom}></div>
              </div>
              
              <div className={styles.cardContent}>
                <div className={styles.cardRole}>{member.role}</div>
                <h3 className={styles.cardName}>{member.name}</h3>
                
                {/* Tech UI Elements on Card */}
                <div className={styles.cardCrosshair}></div>
                <div className={styles.cardData}>ACTIVE</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
