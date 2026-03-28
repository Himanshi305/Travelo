"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";



const stats = [
  { label: "♡ Anywhere You Go" },
  { value: "♧ From Travelers" },
  { label: "♤ Plan Routes"},
  { value: "◇ To Destinations" },
];

function StatsMarquee() {
  return (
    <Marquee
      className="border-white/10 border-y bg-black/30 py-2 backdrop-blur-sm [--duration:30s] [--gap:2rem]"
      pauseOnHover
      repeat={4}
    >
      {stats.map((stat, index) => (
        <div
          className="flex items-center gap-3 whitespace-nowrap"
          key={`${index}-${stat.label || stat.value || 'stat'}`}
        >
          <span className="font-bold font-mono text-primary text-sm tracking-wide">
            {stat.value}
          </span>
          <span className="font-medium font-mono text-sm text-white/70 uppercase tracking-[0.15em]">
            {stat.label}
          </span>
          <span className="text-base">{stat.emoji}</span>
        </div>
      ))}
    </Marquee>
  );
}

export default function Hero() {
  return (
    <section className="relative flex h-screen w-full flex-col items-start justify-between">
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage: `url('https://res.cloudinary.com/dwuljx2zv/image/upload/v1774700770/Complete_Guide_To_Backpacking_In_Arunachal_Pradesh_-_Lost_With_Purpose_ioqn7q.jpg')`,
          filter: 'blur(5px)',
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="relative z-10 w-full max-w-4xl px-4 text-white sm:px-8 lg:px-16 pt-12 mt-20 sm:mt-24">
        <div className="space-y-4">
          <StatsMarquee />
        </div>
      </div>
      <div className="relative z-10 w-full px-4 pb-16 sm:px-8 sm:pb-24 lg:px-16 lg:pb-32">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="w-full space-y-4 sm:w-1/2">
            <h1 className="font-medium text-4xl text-white leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              We <span className="text-primary">think</span>, you{" "}
              <span className="text-primary">travel</span>
              <br />
              <span className="inline-block bg-gradient-to-r from-green-300 to-blue-500 bg-clip-text text-transparent">
                — that's the vibe
              </span>
            </h1>
          </div>
          <div className="w-full sm:w-1/2">
            <p className="text-white/50 text-primary italic sm:text-right md:text-2xl">
              Our platform is designed to provide a secure and user-friendly digital environment where users can easily access services, manage information, and interact with the system efficiently. Built with modern web technologies, the project ensures reliability, scalability, and smooth performance across different devices.

            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
