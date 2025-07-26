"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/custom-button";
import { Label } from "@/components/ui/label";
import { DatabaseBackup, Lock, User, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, verifyPassword } = useAuth();
  const [username, setUsername] = useState("Technické oddělení");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Fixed username in Czech and password verification using auth context
    const fixedUsername = "Technické oddělení";
    
    try {
      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Use async password verification
      const isValid = await verifyPassword(password);
      
      if (isValid) {
        toast.success("Přihlášení úspěšné", {
          description: "Vítejte v aplikaci DB Sync Utility"
        });
        
        // Use auth context to login with fixed username
        login(fixedUsername);
        
        // Redirect to main app after successful login
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        toast.error("Přihlášení selhalo", {
          description: "Neplatné heslo. Výchozí heslo je 'admin'"
        });
      }
    } catch (error) {
      console.error("Error during login:", error);
      toast.error("Přihlášení selhalo", {
        description: "Došlo k chybě při ověřování hesla"
      });
    } finally {
      setIsLoading(false);
    }
  };

  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
        <motion.div
          key="login-form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md px-4"
        >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            >
              <Card className="border-2 shadow-lg">
                <CardHeader className="space-y-1 flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2"
                  >
                    <DatabaseBackup className="h-8 w-8 text-primary" />
                  </motion.div>
                  <CardTitle className="text-2xl font-bold text-center">DB Sync Utility</CardTitle>
                  <CardDescription className="text-center">
                    Přihlaste se pro přístup k aplikaci
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Uživatelské jméno</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="username"
                          value="Technické oddělení"
                          className="pl-10 bg-muted/50"
                          disabled
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Přihlašovací jméno je pevně nastaveno</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Heslo</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="admin"
                          className="pl-10"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Výchozí heslo je "admin"</p>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="mr-2"
                            >
                              <DatabaseBackup className="h-4 w-4" />
                            </motion.div>
                            Přihlašování...
                          </>
                        ) : (
                          <>
                            <LogIn className="mr-2 h-4 w-4" /> Přihlásit se
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-xs text-muted-foreground">
                    {new Date().getFullYear()} DB Sync Utility
                  </p>
                </CardFooter>
              </Card>
            </motion.div>
        </motion.div>
    </div>
  );
}
