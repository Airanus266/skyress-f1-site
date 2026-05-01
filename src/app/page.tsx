"use client";

import { useEffect } from "react";
import Hero from "@/components/Hero";
import Team from "@/components/Team";
import Competition from "@/components/Competition";
import Process from "@/components/Process";
import Highlights from "@/components/Highlights";
import Gallery from "@/components/Gallery";
import Footer from "@/components/Footer";

// Import GSAP only on client side to register ScrollTrigger Globally
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Home() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    // Refresh ScrollTrigger after a slight delay to ensure fonts/images are loaded
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
  }, []);

  return (
    <>
      <Hero />
      <Team />
      <Competition />
      <Process />
      <Highlights />
      <Gallery />
      <Footer />
    </>
  );
}
