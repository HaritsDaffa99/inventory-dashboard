"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, ChevronRight, Pill, Stethoscope, Syringe, Thermometer, Clipboard, HeartPulse } from 'lucide-react';

export default function Hero() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const floatingIcons = [
    { Icon: Pill, size: 24, position: "top-32 right-24" },
    { Icon: Stethoscope, size: 32, position: "top-48 right-48" },
    { Icon: Syringe, size: 28, position: "bottom-32 right-16" },
    { Icon: Thermometer, size: 24, position: "bottom-48 right-40" },
    { Icon: Clipboard, size: 30, position: "top-64 right-32" },
    { Icon: HeartPulse, size: 26, position: "bottom-24 right-48" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#00B9AD] to-[#008C82]">
      {/* Navigation */}
      <nav className="absolute top-0 z-50 w-full">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
          <div className="flex items-center space-x-2">
            <Activity className="h-8 w-8 text-white" />
            <span className="text-2xl font-bold text-white">
              <span className="text-white text-4xl">Si</span>
              <span className="text-yellow-300 text-4xl">Modis</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-20 lg:grid-cols-2 lg:pt-0">
        {/* Left Side - Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-white"
        >
          <h1 className="text-5xl font-bold leading-tight lg:text-6xl">
            Smart Medical
            <br />
            <span className="text-yellow-300">Inventory System</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-white/90">
            Designed for monitoring medicines and medical supplies in health
            warehouses and puskesmas across Indonesia.
          </p>
          <div className="mt-8 flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/login")}
              className="group flex items-center space-x-2 rounded-full bg-yellow-300 px-8 py-3 font-semibold text-gray-900 hover:bg-yellow-400"
            >
              <span>Get Started</span>
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </motion.button>
          </div>
        </motion.div>

        {/* Right Side - Illustration */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10"
        >
          <div className="relative h-[500px] w-full">
            {/* Original Floating Elements */}
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="absolute -right-4 top-20 h-16 w-16 rounded-2xl bg-white/10 p-3 backdrop-blur-sm"
            >
              <Activity className="h-full w-full text-yellow-300" />
            </motion.div>
            <motion.div
              animate={{
                y: [0, 10, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="absolute left-10 top-40 h-20 w-20 rounded-full bg-white/10 p-4 backdrop-blur-sm"
            >
              <div className="h-full w-full rounded-full bg-yellow-300/50" />
            </motion.div>

            {/* Additional Floating Elements - Only render on client */}
            {isClient && floatingIcons.map((item, index) => (
              <motion.div
                key={index}
                className={`absolute ${item.position}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.8,
                  delay: 0.5 + index * 0.1,
                  ease: "easeOut",
                }}
              >
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 4 + index,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                  className="rounded-xl bg-white/10 p-3 backdrop-blur-sm"
                >
                  <item.Icon 
                    size={item.size} 
                    className="text-yellow-300" 
                  />
                </motion.div>
              </motion.div>
            ))}

            {/* Decorative Circles - Only render on client */}
            {isClient && [...Array(3)].map((_, index) => (
              <motion.div
                key={`circle-${index}`}
                className={`absolute ${
                  index % 2 === 0 ? "bg-yellow-300/20" : "bg-white/10"
                } rounded-full`}
                style={{
                  width: `${40 + index * 20}px`,
                  height: `${40 + index * 20}px`,
                  right: `${150 + index * 40}px`,
                  top: `${100 + index * 30}px`,
                }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 3 + index,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Wave Shape */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
        >
          <path
            fill="white"
            fillOpacity="1"
            d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,224C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      </div>
    </div>
  );
}