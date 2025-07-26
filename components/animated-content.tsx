'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedContentProps {
  children: React.ReactNode;
  activeTab: string;
  className?: string;
}

export function AnimatedContent({ children, activeTab, className = '' }: AnimatedContentProps) {
  // Content animation variants
  const contentVariants = {
    initial: { 
      opacity: 0, 
      y: 20,
      scale: 0.98
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.6, -0.05, 0.01, 0.99] as [number, number, number, number],
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      scale: 0.98,
      transition: {
        duration: 0.3,
        ease: [0.6, -0.05, 0.01, 0.99] as [number, number, number, number]
      }
    }
  };

  const itemVariants = {
    initial: { 
      opacity: 0, 
      y: 15
    },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.6, -0.05, 0.01, 0.99] as [number, number, number, number]
      }
    }
  };

  return (
    <div className={`mt-6 flex-1 flex flex-col min-h-0 ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={contentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex-1 flex flex-col min-h-0 pr-2 bg-gray-900/20 backdrop-blur-sm rounded-2xl border border-gray-700/30 p-4 shadow-xl relative"
        >
          {/* Animated background gradient */}
          <motion.div
            animate={{
              opacity: [0.1, 0.2, 0.1],
              scale: [1, 1.05, 1]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"
          />
          
          <motion.div
            animate={{
              opacity: [0.05, 0.15, 0.05],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"
          />

          {/* Content with staggered animation */}
          <motion.div
            variants={itemVariants}
            className="relative z-10 flex-1 flex flex-col min-h-0 overflow-y-auto"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#ef4444 transparent'
            }}
          >
            {children}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-red-500/30 to-transparent rounded-full"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
