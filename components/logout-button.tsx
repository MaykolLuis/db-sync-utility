"use client";

import { LogOut, Loader2 } from "lucide-react";
import { Button } from "./custom-button";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function LogoutButton() {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    
    // Show toast and logout after a short delay for better UX
    toast.success("Odhlášení úspěšné", {
      description: "Budete přesměrováni na přihlašovací stránku"
    });
    
    setTimeout(() => {
      logout();
      setIsLoggingOut(false);
    }, 1500);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="relative overflow-hidden bg-primary-foreground/20 border-primary-foreground/30 hover:bg-primary-foreground/30"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isLoggingOut ? (
            <motion.div
              key="logging-out"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Odhlášení...
            </motion.div>
          ) : (
            <motion.div
              key="logout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Odhlásit
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}
