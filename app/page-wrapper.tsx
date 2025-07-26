"use client";

import { useState, useEffect } from "react";
import DBSyncUtility from "./page";
import ProtectedRoute from "@/components/protected-route";
import { LogoutButton } from "@/components/logout-button";
import { motion, AnimatePresence } from "framer-motion";
import { DatabaseBackup, User, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PageTransition } from "@/components/page-transition";
import Link from "next/link";
import { Button } from "@/components/custom-button";

export default function PageWrapper() {
  const { isAuthenticated } = useAuth();
  const [username, setUsername] = useState<string>("");
  const [showHeader, setShowHeader] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated) {
      const authData = localStorage.getItem("db-sync-auth");
      if (authData) {
        try {
          const { username } = JSON.parse(authData);
          setUsername(username);
          
          // Show header with a slight delay for better animation sequence
          setTimeout(() => setShowHeader(true), 300);
        } catch (error) {
          console.error("Error parsing auth data:", error);
        }
      }
    }
  }, [isAuthenticated]);

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <AnimatePresence>
          {showHeader && (
            <motion.header 
              className="bg-primary text-primary-foreground py-2 px-4 shadow-md z-10"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="container mx-auto flex items-center justify-between">
                <motion.div 
                  className="flex items-center gap-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <DatabaseBackup className="h-6 w-6" />
                  <h1 className="text-lg font-bold">DB Sync Utility</h1>
                </motion.div>
                
                <motion.div 
                  className="flex items-center gap-3"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <div className="flex items-center gap-2 bg-primary-foreground/10 px-3 py-1 rounded-full">
                    <User className="h-4 w-4" />
                    <span className="text-sm">
                      <span className="font-medium">{username}</span>
                    </span>
                  </div>
                  
                  <Link href="/settings">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="bg-primary-foreground/10 hover:bg-primary-foreground/20"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </Link>
                  
                  <LogoutButton />
                </motion.div>
              </div>
            </motion.header>
          )}
        </AnimatePresence>
        
        <main className="flex-grow">
          <PageTransition>
            <DBSyncUtility />
          </PageTransition>
        </main>
      </div>
    </ProtectedRoute>
  );
}
