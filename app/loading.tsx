"use client";

import { motion } from "framer-motion";
import { DatabaseBackup, RefreshCw } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center space-y-6 p-8 rounded-lg">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="relative">
          <DatabaseBackup size={64} className="text-primary" />
          <motion.div
            className="absolute inset-0 flex items-center justify-center">
            <RefreshCw size={32} className="text-primary-foreground" />
          </motion.div>
        </motion.div>
        
        <motion.h1 
          className="text-3xl font-bold text-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}>
          DB Sync Utility
        </motion.h1>
        
        <motion.div 
          className="flex flex-col items-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}>
          <div className="h-1 w-64 bg-muted overflow-hidden rounded-full">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <p className="text-muted-foreground">Načítání aplikace...</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
