import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, Fingerprint, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthGateProps {
  onAuthenticated: () => void;
}

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [accessCode, setAccessCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showFingerprintAuth, setShowFingerprintAuth] = useState(false);
  const [authError, setAuthError] = useState("");
  const { toast } = useToast();

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setAuthError("");

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (accessCode === "bintunet") {
      setShowFingerprintAuth(true);
      toast({
        title: "Access code verified",
        description: "Please authenticate with fingerprint or proceed directly.",
      });
    } else {
      setAuthError("Invalid access code. Please try again.");
    }
    setIsVerifying(false);
  };

  const handleFingerprintAuth = async () => {
    setIsVerifying(true);
    
    try {
      // Check if Web Authentication API is available
      if (typeof window !== 'undefined' && 'navigator' in window && 'credentials' in navigator) {
        try {
          // Simple WebAuthn for fingerprint/biometric authentication
          const credential = await navigator.credentials.create({
            publicKey: {
              challenge: new Uint8Array(32),
              rp: { name: "Stream Dashboard" },
              user: {
                id: new Uint8Array(16),
                name: "user@example.com",
                displayName: "Stream User"
              },
              pubKeyCredParams: [{ alg: -7, type: "public-key" }],
              authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required"
              },
              timeout: 60000,
              attestation: "direct"
            }
          });
          
          if (credential) {
            onAuthenticated();
            toast({
              title: "Authentication successful",
              description: "Biometric authentication completed.",
            });
            return;
          }
        } catch (error) {
          console.log("Biometric auth not available, proceeding with access code only");
        }
      }
      
      // Fallback: proceed without biometric if not available
      onAuthenticated();
      toast({
        title: "Authentication successful",
        description: "Access granted with access code.",
      });
    } catch (error) {
      setAuthError("Authentication failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDirectProceed = () => {
    onAuthenticated();
    toast({
      title: "Access granted",
      description: "Welcome to the streaming dashboard.",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Secure Access Required</CardTitle>
          <p className="text-gray-600">Enter access code to continue</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!showFingerprintAuth ? (
            <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
              <div>
                <Label htmlFor="accessCode" className="text-sm font-medium">
                  Access Code
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="accessCode"
                    type="password"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="pl-10"
                    placeholder="Enter access code"
                    required
                  />
                </div>
              </div>
              
              {authError && (
                <Alert variant="destructive">
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isVerifying || !accessCode}
              >
                {isVerifying ? "Verifying..." : "Verify Access Code"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Fingerprint className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Biometric Authentication</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Use your fingerprint or face ID for additional security, or proceed directly.
                </p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleFingerprintAuth}
                  className="w-full"
                  disabled={isVerifying}
                >
                  <Fingerprint className="h-4 w-4 mr-2" />
                  {isVerifying ? "Authenticating..." : "Use Biometric Authentication"}
                </Button>
                
                <Button 
                  onClick={handleDirectProceed}
                  variant="outline"
                  className="w-full"
                  disabled={isVerifying}
                >
                  Proceed Without Biometric
                </Button>
              </div>
              
              {authError && (
                <Alert variant="destructive">
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Default access code: <code className="bg-gray-100 px-1 rounded">bintunet</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}