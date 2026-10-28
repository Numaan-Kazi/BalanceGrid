import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  LogIn,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";

declare global {
  interface Window {
    google?: any;
  }
}

export const LoginPage: React.FC = () => {
  const {
    user,
    isGoogleConfigured,
    googleClientId,
    login,
    register,
    loginWithGoogleCredential,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign In Form State
  const [signInIdentifier, setSignInIdentifier] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInErrors, setSignInErrors] = useState<{
    identifier?: string;
    password?: string;
  }>({});

  // Register Form State
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regErrors, setRegErrors] = useState<{
    name?: string;
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    // Initialize Google Identity Services if client ID is configured
    if (isGoogleConfigured && googleClientId && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            try {
              if (response.credential) {
                await loginWithGoogleCredential(response.credential);
                navigate("/dashboard");
              }
            } catch (err: any) {
              setAuthError(err.message || "Google sign-in failed");
            }
          },
        });

        const btnDiv = document.getElementById("googleSignInBtn");
        if (btnDiv) {
          window.google.accounts.id.renderButton(btnDiv, {
            theme: "outline",
            size: "large",
            width: 320,
            text: "continue_with",
            shape: "rectangular",
          });
        }
      } catch (err) {
        console.error("Error initializing Google Sign-In:", err);
      }
    }
  }, [isGoogleConfigured, googleClientId, loginWithGoogleCredential, navigate]);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const errors: typeof signInErrors = {};

    if (!signInIdentifier.trim()) {
      errors.identifier = "Username or email is required";
    }
    if (!signInPassword) {
      errors.password = "Password is required";
    }

    if (Object.keys(errors).length > 0) {
      setSignInErrors(errors);
      return;
    }
    setSignInErrors({});
    setIsSubmitting(true);

    try {
      await login(signInIdentifier.trim(), signInPassword);
      navigate("/dashboard");
    } catch (err: any) {
      setAuthError(err.message || "Invalid username/email or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const errors: typeof regErrors = {};

    if (!regName.trim()) {
      errors.name = "Full name is required";
    }
    if (!regUsername.trim()) {
      errors.username = "Username is required";
    } else if (regUsername.trim().length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(regUsername.trim())) {
      errors.username =
        "Username can only contain alphanumeric characters, underscores, and hyphens";
    }

    if (!regEmail.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errors.email = "Valid email address is required";
    }

    if (!regPassword) {
      errors.password = "Password is required";
    } else if (regPassword.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!regConfirmPassword) {
      errors.confirmPassword = "Confirm your password";
    } else if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }
    setRegErrors({});
    setIsSubmitting(true);

    try {
      await register({
        name: regName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });
      navigate("/dashboard");
    } catch (err: any) {
      setAuthError(
        err.message || "Registration failed. Please verify your details.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 ">
        <img
          src="/Login-Page.jpg"
          alt="Login Page"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="relative z-10 min-h-screen flex flex-col items-start justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md mb-4">
            <Wallet className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-content-primary">
            {mode === "signin" ? "Sign in to BalanceGrid" : "Create an Account"}
          </h2>
          <p className="mt-1 text-xs text-content-secondary">
            Personal Finance Tracker with strict database-level multi-user
            isolation
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 shadow-sm border border-surface-border rounded-xl space-y-6">
            {/* Tabs */}
            <div className="grid grid-cols-2 p-1 bg-surface-muted rounded-lg border border-surface-border">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setAuthError(null);
                }}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mode === "signin"
                    ? "bg-white text-content-primary shadow-xs"
                    : "text-content-secondary hover:text-content-primary"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setAuthError(null);
                }}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mode === "register"
                    ? "bg-white text-content-primary shadow-xs"
                    : "text-content-secondary hover:text-content-primary"
                }`}
              >
                Register
              </button>
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Sign In Form */}
            {mode === "signin" && (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <Input
                  label="Username or Email"
                  placeholder="Enter your username or email"
                  value={signInIdentifier}
                  onChange={(e) => {
                    setSignInIdentifier(e.target.value);
                    if (signInErrors.identifier)
                      setSignInErrors((prev) => ({
                        ...prev,
                        identifier: undefined,
                      }));
                  }}
                  error={signInErrors.identifier}
                  className="text-xs"
                  autoComplete="username"
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  value={signInPassword}
                  onChange={(e) => {
                    setSignInPassword(e.target.value);
                    if (signInErrors.password)
                      setSignInErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                  }}
                  error={signInPassword ? undefined : signInErrors.password}
                  className="text-xs"
                  autoComplete="current-password"
                />

                <Button
                  type="submit"
                  className="w-full text-xs font-semibold"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  <LogIn className="w-3.5 h-3.5 mr-1" />
                  Sign In
                </Button>
              </form>
            )}

            {/* Register Form */}
            {mode === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <Input
                  label="Full Name"
                  placeholder="e.g. Alex Morgan"
                  value={regName}
                  onChange={(e) => {
                    setRegName(e.target.value);
                    if (regErrors.name)
                      setRegErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  error={regErrors.name}
                  className="text-xs"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Username"
                    placeholder="alex_m"
                    value={regUsername}
                    onChange={(e) => {
                      setRegUsername(e.target.value);
                      if (regErrors.username)
                        setRegErrors((prev) => ({
                          ...prev,
                          username: undefined,
                        }));
                    }}
                    error={regErrors.username}
                    className="text-xs"
                    autoComplete="username"
                  />

                  <Input
                    label="Email"
                    type="email"
                    placeholder="alex@example.com"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (regErrors.email)
                        setRegErrors((prev) => ({
                          ...prev,
                          email: undefined,
                        }));
                    }}
                    error={regErrors.email}
                    className="text-xs"
                    autoComplete="email"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (regErrors.password)
                        setRegErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                    }}
                    error={regErrors.password}
                    className="text-xs"
                    autoComplete="new-password"
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="Re-enter password"
                    value={regConfirmPassword}
                    onChange={(e) => {
                      setRegConfirmPassword(e.target.value);
                      if (regErrors.confirmPassword)
                        setRegErrors((prev) => ({
                          ...prev,
                          confirmPassword: undefined,
                        }));
                    }}
                    error={regErrors.confirmPassword}
                    className="text-xs"
                    autoComplete="new-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full text-xs font-semibold mt-2"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Create Account
                </Button>
              </form>
            )}

            {/* Optional Google Sign-In */}
            {isGoogleConfigured && (
              <div className="space-y-4 pt-2">
                <div className="relative w-full text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-surface-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-content-muted">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="flex justify-center w-full">
                  <div
                    id="googleSignInBtn"
                    className="min-h-[44px] flex justify-center w-full"
                  />
                </div>
              </div>
            )}

            {/* Multi-user Isolation Promises */}
            <div className="pt-4 border-t border-surface-border space-y-2">
              <div className="flex items-center gap-2 text-xs text-content-secondary">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Multi-user isolation: Every user has completely private
                  records
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-content-secondary">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Persistent across logout, browser refresh, and all devices
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
