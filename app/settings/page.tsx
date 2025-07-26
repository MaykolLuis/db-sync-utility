"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/custom-button";
import { Label } from "@/components/ui/label";
import { Lock, Save, ArrowLeft, User } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const router = useRouter();
  const { verifyPassword, changePassword, username } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Check if current password is correct using auth context
    if (!verifyPassword(currentPassword)) {
      toast.error("Změna hesla selhala", {
        description: "Aktuální heslo není správné"
      });
      setIsLoading(false);
      return;
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      toast.error("Změna hesla selhala", {
        description: "Nová hesla se neshodují"
      });
      setIsLoading(false);
      return;
    }

    // Simulate password change
    setTimeout(() => {
      // Use auth context to change password
      changePassword(newPassword);
      
      toast.success("Heslo úspěšně změněno", {
        description: "Vaše nové heslo bylo nastaveno"
      });
      
      setIsLoading(false);
      
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 1000);
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-8 max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět na hlavní stránku
          </Button>
          
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Nastavení</CardTitle>
              <CardDescription>
                Změňte si své heslo pro přístup do aplikace
              </CardDescription>
              <div className="mt-4 p-3 bg-muted/30 rounded-md flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Přihlášený uživatel:</p>
                  <p className="text-sm">{username}</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Aktuální heslo</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nové heslo</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Potvrďte nové heslo</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="pt-2"
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
                          <Lock className="h-4 w-4" />
                        </motion.div>
                        Ukládání...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Uložit nové heslo
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
            
            <CardFooter className="flex justify-center">
              <p className="text-xs text-muted-foreground">
                Heslo je uloženo lokálně v prohlížeči
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
}
