'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Database, Search, History, Keyboard } from 'lucide-react';
import { Button } from '@/components/custom-button';
import { NetworkStatusIndicator } from '@/components/network-status-indicator';

interface AnimatedHeaderProps {
  onOpenHistory: () => void;
  onOpenSearch: () => void;
  onOpenShortcuts: () => void;
}

export function AnimatedHeader({ onOpenHistory, onOpenSearch, onOpenShortcuts }: AnimatedHeaderProps) {
  const headerVariants = {
    initial: { opacity: 0, y: -30 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: -20, scale: 0.9 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.6
      }
    }
  };

  const logoVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: { 
      scale: 1, 
      rotate: 0,
      transition: {
        duration: 1,
        delay: 0.2
      }
    }
  };

  const buttonVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <motion.div
      variants={headerVariants}
      initial="initial"
      animate="animate"
      className="p-6 border-b border-gray-700/30 bg-gray-800/30 backdrop-blur-md mt-6 relative overflow-hidden"
    >
      {/* Animated background elements */}
      <motion.div
        animate={{
          x: [-100, 100, -100],
          opacity: [0.1, 0.3, 0.1]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-0 left-0 w-32 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent"
      />

      <div className="flex items-center justify-between relative z-10">
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <motion.div
            variants={logoVariants}
            whileHover={{ 
              rotate: 360,
              transition: { duration: 0.6 }
            }}
            className="relative"
          >
            <Database className="h-8 w-8 text-red-500" />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full bg-red-500/20 blur-sm"
            />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <motion.h1 
              className="text-2xl font-bold bg-gradient-to-r from-white via-red-100 to-red-200 bg-clip-text text-transparent"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              DB Sync Utility
            </motion.h1>
            <motion.p 
              variants={itemVariants}
              className="text-sm text-gray-400"
            >
              Synchronizace databázových souborů
            </motion.p>
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center gap-3">
          {/* Network Status with animation */}
          <motion.div
            variants={buttonVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <NetworkStatusIndicator />
          </motion.div>

          {/* Action buttons with staggered animation */}
          <motion.div
            variants={buttonVariants}
            style={{ "--delay": "0.1s" } as React.CSSProperties}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSearch}
              className="text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
              title="Globální vyhledávání (Ctrl+F)"
            >
              <Search className="h-4 w-4" />
            </Button>
          </motion.div>

          <motion.div
            variants={buttonVariants}
            style={{ "--delay": "0.2s" } as React.CSSProperties}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenHistory}
              className="text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
              title="Historie operací"
            >
              <History className="h-4 w-4" />
            </Button>
          </motion.div>

          <motion.div
            variants={buttonVariants}
            style={{ "--delay": "0.3s" } as React.CSSProperties}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenShortcuts}
              className="text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
              title="Klávesové zkratky"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Animated bottom border */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ 
          duration: 1.5, 
          ease: [0.6, -0.05, 0.01, 0.99],
          delay: 0.5
        }}
        className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent"
      />
    </motion.div>
  );
}
