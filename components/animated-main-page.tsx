'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Sparkles, Loader2, Zap } from 'lucide-react';

interface AnimatedMainPageProps {
  children: React.ReactNode;
  isInitialLoad?: boolean;
}

export function AnimatedMainPage({ children, isInitialLoad = true }: AnimatedMainPageProps) {
  const [showContent, setShowContent] = useState(false);
  const [showWelcome, setShowWelcome] = useState(isInitialLoad);
  const [particles, setParticles] = useState<Array<{left: number, top: number, delay: number, size: number, opacity: number}>>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Generate particles on client-side only to prevent hydration mismatch
  useEffect(() => {
    const generatedParticles = Array.from({ length: 30 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 4,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.6 + 0.2
    }));
    setParticles(generatedParticles);
  }, []);

  // Simulate loading progress
  useEffect(() => {
    if (isInitialLoad && showWelcome) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + Math.random() * 15 + 5;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isInitialLoad, showWelcome]);

  useEffect(() => {
    if (isInitialLoad) {
      // Show welcome animation first, then main content
      const welcomeTimer = setTimeout(() => {
        setShowWelcome(false);
        setShowContent(true);
      }, 3200);

      return () => clearTimeout(welcomeTimer);
    } else {
      // Skip welcome animation if not initial load
      setShowContent(true);
    }
  }, [isInitialLoad]);

  // Welcome screen animation variants
  const welcomeVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { 
      opacity: 1, 
      scale: 1
    },
    exit: { 
      opacity: 0, 
      scale: 1.1
    }
  };

  // Main content animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1
    }
  };

  // Floating particles animation
  const particleVariants = {
    animate: {
      y: [-20, -100, -20],
      opacity: [0, 1, 0]
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {showWelcome && (
          <motion.div
            key="welcome"
            variants={welcomeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{
              duration: 0.8,
              ease: "easeOut"
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-hidden"
          >
            {/* Enhanced Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-blue-500/5" />
              
              {/* Animated Grid */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24px,rgba(255,255,255,0.05)_25px,rgba(255,255,255,0.05)_26px,transparent_27px,transparent_74px,rgba(255,255,255,0.05)_75px,rgba(255,255,255,0.05)_76px,transparent_77px),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[75px_75px]" />
              </div>
              
              {/* Enhanced Particles */}
              {particles.map((particle, i) => (
                <motion.div
                  key={i}
                  variants={particleVariants}
                  animate="animate"
                  transition={{
                    duration: 4 + Math.random() * 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: particle.delay
                  }}
                  className="absolute rounded-full bg-gradient-to-r from-red-400/30 to-blue-400/30 blur-sm"
                  style={{
                    left: `${particle.left}%`,
                    top: `${particle.top}%`,
                    width: `${particle.size}px`,
                    height: `${particle.size}px`,
                    opacity: particle.opacity
                  }}
                />
              ))}
              
              {/* Floating Orbs */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={`orb-${i}`}
                  animate={{
                    x: [0, 100, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{
                    duration: 8 + i * 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 1.5
                  }}
                  className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-red-500/10 to-blue-500/10 blur-xl"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: `${30 + i * 10}%`
                  }}
                />
              ))}
            </div>

            {/* Welcome Content */}
            <div className="relative z-10 text-center max-w-2xl mx-auto px-6">
              {/* Logo Section */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0,
                  transition: {
                    duration: 1.2,
                    ease: [0.6, -0.05, 0.01, 0.99],
                    delay: 0.3
                  }
                }}
                className="mb-8 relative"
              >
                <div className="relative inline-block">
                  {/* Main Logo */}
                  <div className="relative">
                    <motion.div
                      animate={{
                        boxShadow: [
                          '0 0 20px rgba(239, 68, 68, 0.3)',
                          '0 0 40px rgba(239, 68, 68, 0.6)',
                          '0 0 20px rgba(239, 68, 68, 0.3)'
                        ]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto"
                    >
                      <Database className="h-10 w-10 text-white" />
                    </motion.div>
                    
                    {/* Rotating Ring */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className="absolute -inset-2 border-2 border-red-500/30 rounded-3xl"
                    />
                    
                  
                  </div>
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: {
                    duration: 1,
                    delay: 0.6,
                    ease: "easeOut"
                  }
                }}
                className="mb-6"
              >
                <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-white via-red-100 to-blue-100 bg-clip-text text-transparent leading-tight">
                  DB Sync Utility
                </h1>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 1.2 }}
                  className="h-1 w-32 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full"
                />
              </motion.div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: {
                    duration: 0.8,
                    delay: 0.9
                  }
                }}
                className="text-xl md:text-2xl text-slate-300 mb-4 font-light"
              >
                Technický nástroj pro synchronizaci databází
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  transition: {
                    duration: 0.6,
                    delay: 1.1
                  }
                }}
                className="text-lg text-slate-400 mb-12"
              >
                Připravujeme vaše prostředí...
              </motion.p>

              {/* Loading Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: {
                    duration: 0.8,
                    delay: 1.3
                  }
                }}
                className="space-y-6"
              >
               
                
                             
                {/* Loading Icon */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="flex justify-center"
                >
                  <Loader2 className="h-8 w-8 text-red-500" />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {showContent && (
          <motion.div
            key="content"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.6,
              staggerChildren: 0.1,
              delayChildren: 0.2
            }}
            className="min-h-screen"
          >
            {/* Header Animation */}
            <motion.div 
              variants={itemVariants}
              transition={{
                duration: 0.6,
                ease: "easeOut"
              }}
            >
              <div className="relative overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '0%' }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600"
                />
              </div>
            </motion.div>

            {/* Main Content with Staggered Animation */}
            <motion.div 
              variants={itemVariants}
              transition={{
                duration: 0.6,
                ease: "easeOut"
              }}
              className="relative"
            >
              {/* Animated Background Elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.1, 0.2, 0.1]
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-32 -right-32 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"
                />
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.05, 0.15, 0.05]
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                  }}
                  className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
                />
              </div>

              {/* Content with entrance animations */}
              <motion.div
                variants={itemVariants}
                className="relative z-10"
              >
                {children}
              </motion.div>
            </motion.div>

            {/* Footer Animation */}
            <motion.div
              variants={itemVariants}
              className="relative"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ 
                  duration: 1.2, 
                  ease: [0.6, -0.05, 0.01, 0.99],
                  delay: 0.5
                }}
                className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
