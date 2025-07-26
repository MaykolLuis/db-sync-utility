"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DatabaseBackup, RefreshCw, CheckCircle } from "lucide-react";

interface LoadingAnimationProps {
  onComplete: () => void;
}

export default function LoadingAnimation({ onComplete }: LoadingAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  
  useEffect(() => {
    // Simulate loading progress - slower for better visibility
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setShowComplete(true);
            setTimeout(onComplete, 1500);
          }, 800);
          return 100;
        }
        return prev + 2; // Slower increment
      });
    }, 150); // Longer interval
    
    return () => clearInterval(interval);
  }, [onComplete]);
  
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center space-y-8 p-8 rounded-lg"
      >
        <AnimatePresence mode="wait">
          {!showComplete ? (
            <motion.div
              key="loading"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <DatabaseBackup size={80} className="text-primary" />
              </motion.div>
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw size={40} className="text-primary-foreground" />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
              className="text-green-500"
            >
              <CheckCircle size={80} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.h1 
          className="text-3xl font-bold text-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          DB Sync Utility
        </motion.h1>
        
        <motion.div 
          className="flex flex-col items-center space-y-2 w-64"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between w-full">
            <p className="text-xs text-muted-foreground">Načítání aplikace...</p>
            <p className="text-xs font-medium">{progress}%</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
