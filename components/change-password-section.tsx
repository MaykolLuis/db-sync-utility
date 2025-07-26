import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/custom-button";
import { Label } from "@/components/ui/label";
import { Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { SectionHeader } from "@/components/section-header";
import { motion } from "framer-motion";

export function ChangePasswordSection() {
  const { verifyPassword, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if current password is correct using auth context
      const isValid = await verifyPassword(currentPassword);
      if (!isValid) {
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

      // Short delay for UX before changing password
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Use auth context to change password
      await changePassword(newPassword);
      
      toast.success("Heslo úspěšně změněno", {
        description: "Vaše nové heslo bylo nastaveno"
      });
      
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Změna hesla selhala", {
        description: "Nastala neočekávaná chyba"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <SectionHeader
        title="Změna hesla"
        description="Změňte si své heslo pro přístup do aplikace"
        variant="gray"
      />
      <CardContent className="pt-4">
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
        </form>
      </CardContent>
      <CardFooter>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full"
        >
          <Button
            onClick={handleChangePassword}
            className="w-full bfi-button gap-2"
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
      </CardFooter>
    </Card>
  );
}
