import { useState } from "react";
import axios from 'axios';
import { API_URL } from "../config";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await axios.post(`${API_URL}/login`, { loginIdentifier: email, password });
      const body = resp.data;
      if (body && body.token) {
        localStorage.setItem('token', body.token);
        localStorage.setItem('username', email);
        // redirect to legacy quiz page
        window.location.href = '/quiz.html';
      } else {
        setError('Resposta inválida do servidor.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4 sm:p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-accent/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <Card className="w-full max-w-md bg-gradient-card border-border/50 backdrop-blur-sm shadow-glow-primary relative z-10 mx-4 sm:mx-0">
        <div className="p-6 sm:p-8 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Concursando
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Plataforma de IA para questões personalizadas
            </p>
          </div>

          <Separator className="bg-border/50" />

          <div className="space-y-2 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-card-foreground">
              Bem-vindo de volta!
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Entre na sua conta para continuar estudando
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-card-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input/50 border-border/50 backdrop-blur-sm focus:border-primary focus:shadow-glow-primary transition-all duration-300"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-card-foreground">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-input/50 border-border/50 backdrop-blur-sm focus:border-primary focus:shadow-glow-primary transition-all duration-300"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-xs sm:text-sm text-muted-foreground">
                  Lembrar de mim
                </Label>
              </div>
              <Button variant="link" className="text-xs sm:text-sm text-primary hover:text-accent p-0 self-start sm:self-auto">
                Esqueceu a senha?
              </Button>
            </div>

            <Button type="submit" variant="gradient" className="w-full">
              Entrar
            </Button>
          </form>

          <div className="relative">
            <Separator className="bg-border/50" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2">
              <span className="text-xs text-muted-foreground">Ou</span>
            </div>
          </div>

          <div className="text-center">
            <span className="text-xs sm:text-sm text-muted-foreground">
              Não tem uma conta?{" "}
            </span>
            <Button variant="link" className="text-xs sm:text-sm text-primary hover:text-accent p-0">
              Cadastre-se gratuitamente
            </Button>
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <p className="text-xs text-muted-foreground">
          © 2024 Concursando. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default LoginForm;