import { useState } from "react";
import { createClient } from "~/lib/client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Navigate, redirect, useNavigate } from "react-router";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
const navigate = useNavigate()
  
  const supabase = createClient();

 const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  //Query langsung ke tabel users (Bukan lewat Auth)
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("password", password) 
    .single();

  if (error || !user) {
    alert("Username atau Password salah, Pak/Bu!");
    setLoading(false);
    return;
  }

  localStorage.setItem("user_session", JSON.stringify(user));

  navigate("/dashboard")
  setLoading(false);
};

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-sans">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-zinc-100 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">POS Login</CardTitle>
          <CardDescription className="text-zinc-400">
            Login pake username admin lu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username"
                type="text" 
                placeholder="Contoh: admin_kuro" 
                className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-blue-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password"
                type="password" 
                className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 transition-colors" 
              disabled={loading}
            >
              {loading ? "Sabar, lagi dicek..." : "Masuk Sekarang"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}